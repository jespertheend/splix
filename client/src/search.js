const segmenter = new Intl.Segmenter('fr', { granularity: 'word' });


const segment_and_normalize = text => Array.from(segmenter.segment(text))
    .filter(segment => segment.isWordLike)
    .map(segment => segment.segment.toLowerCase());

const argmin = (...tab) => tab.reduce(((w,v,i) => (v<w[0]?[v,i]:w)),[+Infinity,-1]);

const damerau_levenshtein = (left,right) => {
    const insertion = 1;
    const deletion = 10;
    const substitution = 10;
    const transposition = 10;
    const separation = 2;
    const w = left.length;
    const h = right.length;
    if(w === 0) return h;
    if(h === 0) return w;
    let distances_0 = new Array(h+1).fill(-1);
    let distances_1 = new Array(h+1).fill(-1);
    let distances_2 = new Array(h+1).fill(-1);
    let choices_0 = new Array(h+1).fill(-1);

    for(let i = 0; i < w+1; i++){
        for(let j = 0; j < h+1; j++){
            if(i ==0) {distances_0[j] = j*insertion;}
            else if(j==0) {distances_0[j] = i*deletion;}
            else {
                const match = left[w-i] != right[h-j];
                const transpose = i > 1 && j > 1 && left[w-i+1]==right[h-j] && left[w-i]==right[h-j+1];
                let result =  argmin(
                        distances_1[j] + deletion,
                        distances_0[j-1] + (choices_0[j-1] == 1 ? insertion: separation),
                        distances_1[j-1]+match*substitution,
                        transpose ? distances_2[j-2]+match*transposition : +Infinity,
                    );
                distances_0[j]=result[0];
                choices_0[j] = result[1];
            }
        }
        const distances_swap = distances_2;
        distances_2 = distances_1;
        distances_1 = distances_0;
        distances_0 = distances_swap;

    }
    return distances_1.at(-1);
};

class SearchResult {
    repr;
    data;
    constructor(repr, data){
        this.repr = repr;
        this.data = data.map( word => word.toLowerCase());
    }


    /**
     * 
     * @param {string[]} query
     * @returns {number}
     */
    score(query){
        let score = {value: 0, matches: []};
        for(const query_word of query){
            for(const data_word of this.data){
                const dl = damerau_levenshtein(query_word,data_word);
                const max = 15;
                if(dl <=max){
                    const delta = 1 - Math.tanh(8*(dl-max/2)/(3*max));
                    score.value-= delta;
                    score.matches.push({"data": data_word, "query": query_word, "score": dl});
                }
            }
        }
        score.matches.sort((left,right) => right.score - left.score);
        return score;
    }

    desc(){
        return this.repr;
    }
}

class SearchBox {
    /**
     * @type {HTMLInputElement}
     */
    b;
    /**
     * @type {HTMLUListElement}
     */
    l;
    /**
     * @type {SearchResult[]}
     */
    store =[];
    constructor(bar,list){
        this.b = bar;
        this.b.addEventListener('input', () => {
            const results = this.search(this.b.value);
            this.populate_list(results,segment_and_normalize(this.b.value));
        })
        this.l = list;
    }

    /**
     * @param {[SearchResult,number][]} results
     */
    populate_list(results,query){
        this.l.replaceChildren(...results.map(([result,score]) => {
            if(score.value === 0 && query.length > 0){
                result.repr.classList.add('search-negative');
                return undefined;
            } else {
                result.repr.classList.remove('search-negative');
            }
            return result.repr;
        }).filter(v=>v));
    }

    search(query){
        const query_words = segment_and_normalize(query);
        const scores = this.store.map(result => [result,result.score(query_words)]);
        scores.sort( (pair_left,pair_right) => pair_left[1].value - pair_right[1].value);
        return scores;
    }
}