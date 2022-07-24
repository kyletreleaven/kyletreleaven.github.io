class App {

    // TODO: Pile shuffling algorithm works.
    // Now we just need the app work!

	constructor() {
	}

	main() {
		window.onload = () => this.onload();
	}
    
	onload() {
		var div = document.getElementById("top");
        this.div = div;

        // Let's have some fun.
        let n_cards = 25;
        let card_offset = 13;
        let n_piles = 5;

        let start = range(n_cards).map((i) => i + card_offset);
        let perm = Permutations.random(n_cards);

        // Draw the cards.
        let card_guide = new CardGuide();

        let hand_canvas = () => {
            var canvas = document.createElement("canvas");
            canvas.width = 1000;
            canvas.height = 200;
            div.appendChild(canvas);
            return canvas;
        }

        let next_canvas = () => {
            var canvas = document.createElement("canvas");
            canvas.width = 1500;
            canvas.height = 300;
            div.appendChild(canvas);
            return canvas;
        };

        const DEST_WIDTH = 100;
        const DEST_HEIGHT = 150;

        const HAND_STRIDE_X = 15;
        const HAND_STRIDE_Y = 0;

        // seems there should be a better way...
        card_guide.ready_promise.then(
            () => {
                var canvas;
                var ctx;

                // draw perm
                this.print("We're looking at computer-assisted pile shuffling.")
                this.print("Computers are pretty good at generating pseudo-perfect random permutations on our behalf.");
                this.print(`For example, here we see a random shuffle of a deck of ${n_cards} cards.`);
                this.print("(Try refreshing the page; you will get a new shuffle each time.)");

                canvas = hand_canvas();
                ctx = canvas.getContext("2d");

                Permutations.sample(start, perm).map(
                    (e, i) => {
                        // ..., dx, dy, dwidth, dheight
                        card_guide.draw_card(ctx, e, HAND_STRIDE_X * i, HAND_STRIDE_Y * i, DEST_WIDTH, DEST_HEIGHT);
                    }
                );
                
                // draw regular
                this.print(`But our deck starts with a different ordering. (Note, this ordering is that same each time you refresh the page.)`);

                canvas = hand_canvas();
                ctx = canvas.getContext("2d");

                start.map(
                    (e, i) => {
                        // ..., dx, dy, dwidth, dheight
                        card_guide.draw_card(ctx, e, HAND_STRIDE_X * i, HAND_STRIDE_Y * i, DEST_WIDTH, DEST_HEIGHT);
                    }
                );

                // draw all the steps... whoa!
                let stack_based = true;

                this.print("The computer can then guide us through a pile shuffle to obtain the [first] goal permutation. In this way we can achieve \"perfect\" pile shuffling.");
                this.print("In pile shuffling, we can only ever place the next (top) card of the deck on the top of a new or existing pile of cards.");
                let driver = new HistoryDriver([...start], stack_based);
                this.driver = driver;

                // let shuffler = new PileShuffle(n_piles);
                // shuffler.shuffle(perm, driver);

                // Alternative method.
                // TODO: Unify them.
                let helper = new PilesHelper(n_piles, stack_based);

                function deshuffle(perm, driver) {
                    let guide = helper.getShuffleGuide(perm, stack_based);
                    let executor = new ShuffleGuideExecutor(guide, stack_based);
                    executor.executeShuffle(perm, driver);
                }
                
                let perm_ = Permutations.get_inverse(perm);
                deshuffle(perm_, driver);

                let history = this.driver.history;

                let draw_history = () => {
                    // console.log(history);

                    this.print(`We complete the shuffle in ${history.length} phases using ${n_piles} piles.`);

                    for (let k=0; k < history.length; k++) {
                        this.print(`For phase ${k+1}:`);

                        let event = history[k];
                        console.log(event);

                        // Draw the piles.
                        this.print("We deal out the piles.")
                        if (stack_based) {
                            this.print("(The cards are actually face down, but drawn so we can see their values...)");
                        }
                        let table = range(n_piles).map((_) => []);
    
                        event.deal.forEach((p, i) => {
                            table[p].push(event.hand_in[i])
                        });
    
                        // console.log(table);
    
                        canvas = next_canvas();
                        ctx = canvas.getContext("2d");
    
                        table.forEach(
                            (pile, x) => {
                                pile.forEach(
                                    (c, y) => {
                                        card_guide.draw_card(
                                            ctx, c, 230 * x + 15 * y, 20 * y, DEST_WIDTH, DEST_HEIGHT
                                        );
                                    }
                                );
                            }
                        );
    
                        // draw perm
                        this.print("...then we gather the piles back up, left to right.")
                        canvas = hand_canvas();
                        ctx = canvas.getContext("2d");
    
                        event.hand_out.map(
                            (e, i) => {
                                // ..., dx, dy, dwidth, dheight
                                card_guide.draw_card(ctx, e, HAND_STRIDE_X * i, HAND_STRIDE_Y * i, DEST_WIDTH, DEST_HEIGHT);
                            }
                        );
                    }
                };

                draw_history();
                this.print("The shuffle is now complete! (You can check it against the original permutation at the top.)")

                this.print("Just for fun, we can as easily reverse the process to recover the original order.")
                history.length = 0;
                // shuffler.deshuffle(perm, driver);
                deshuffle(perm, driver);
                draw_history();
                this.print("And now our deck is back in the original order!");

            }
        );

        // div.innerHTML = "<h1>Hello there.</h1>";

		const killIt = () => {
				h = div.firstElementChild;
				div.remove(h);
			};
	}

    print(string) {
        let text = document.createTextNode(string);
        let p = document.createElement("p");
        p.appendChild(text);
        this.div.appendChild(p);
    }
}


function sortNumeric(arr, key_fn) {
    // are you... fucking serious?
    if (key_fn === undefined) {
        return arr.sort((a, b) => a - b);
    } else {
        return arr.sort((a, b) => key_fn(a) - key_fn(b));
    }
}


function isOrdered(arr) {
    let arr_ = [...arr];
    sortNumeric(arr_);
    return arr.map((e, i) => e == arr_[i]).reduce((a, b) => a && b);
}


function assert(condition, message) {
    if (!condition) {
        throw new Error(message || "Assertion failed");
    }
}


class Permutations {

    static random(n) {
        let arr = [...Array(n).keys()];
        this.shuffle(arr);
        return arr;
    }

    static shuffle(array) {
      /* standard Fisher-Yates (Knuth) shuffle.

      https://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array

       */
      let currentIndex = array.length,  randomIndex;

      // While there remain elements to shuffle.
      while (currentIndex != 0) {

        // Pick a remaining element.
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;

        // And swap it with the current element.
        [array[currentIndex], array[randomIndex]] = [
          array[randomIndex], array[currentIndex]];
      }

      return array;
    }

    static get_inverse(array) {
        return array
            .map((e, i) => [e, i])
            .sort((a, b) => a[0] - b[0])  // saved by numeric sort
            .map((tup) => tup[1]);
    }

    static sample(arr, perm) {
        return perm.map((i) => arr[i]);
    }
}


class bAry {
    /* Number representations in any base. */

    constructor(b) {
        if (!Number.isInteger(b) || b < 2) {
            throw "base must be integer > 1";
        }

        this.base = b;
    }

    ceilLogk(n) {
        /* not super efficient... */
        if (n < 1) {
            throw "this log not defined below 1."
        }

        let base = this.base;

        function check(raise, bRaised) {
            if (bRaised >= n) {
                return raise;
            } else {
                return check(raise + 1, bRaised * base)
            }
        }
        return check(0, 1);
    }

    repr(n) {
        /* b-ary representation

        Note: Least significant place first!

        */

        if (!Number.isInteger(n) || n < 0) {
            throw "must be non-negative integer";
        }

        let buff = [];
        let N = n;
        while (N > 0) {
            buff.push(N % this.base);
            N = Math.floor(N / this.base);
        }
        return buff;
    }

    value(repr) {
        return repr
            .map((e, i) => e * Math.pow(this.base, i))
            .reduce((agg, x) => agg + x);
    }
}


class PileShuffle {
    /*

    This is actually a sorting algorithm.
    Closest literature seems to be on https://en.wikipedia.org/wiki/Patience_sorting .

     */

    constructor(n_piles) {
        this.n_piles = n_piles;
    }

    wrap(array) {
        return new ArrayDriver(array, this.n_piles);
    }

    shuffle(permutation, driver) {
        this.deshuffle(Permutations.get_inverse(permutation), driver);
    }

    deshuffle(permutation, driver) {
        let driver_ = this.wrap([...permutation]);

        let n_phases = this.get_num_phases(permutation.length);

        for (let phase_idx = 0; phase_idx < n_phases; phase_idx++) {

            // TODO: Deprecate?
            driver.start_phase(phase_idx);

            let phaseDigit = (m) => {
                let M = new bAry(this.n_piles).repr(m);
                let pile_idx = (M.length > phase_idx ? M[phase_idx] : 0);
                if ((n_phases - phase_idx) % 2 == 0) {
                    pile_idx = (this.n_piles - 1) - pile_idx;
                }
                return pile_idx;
            };
            let layout = driver_.hand.map(phaseDigit);

            driver.deal([...layout]);
            driver_.deal(layout);  // Let it consume; doesn't matter.
        }
    }

    get_num_phases(n_cards) {
        return new bAry(this.n_piles).ceilLogk(n_cards);
    }

    static min_piles(n_cards, n_phases) {
        // min numPiles >= 0 such that shufflePhases(numCards, numPiles) <= numPhase
        // s.t., ceil (numCards)^(1/numPhase) = numPiles
        return Math.ceil(Math.pow(n_cards, 1.0 / n_phases));
    }
}


class CardGuide {
    // Let's draw the cards in a little row.
    // https://codehs.com/tutorial/andy/Programming_Sprites_in_JavaScript

    constructor() {

        this.SRC = "cards.png";
        this.COLUMNS = 13;

        this.WIDTH = 72;
        this.HEIGHT = 98;
        this.START_X = 1;
        this.START_Y = 0;
        this.STRIDE_X = this.WIDTH + 1;
        this.STRIDE_Y = this.HEIGHT;

        this.image = new Image();

        this.ready_promise = new Promise((resolve, reject) => {
            this.image.onload = () => resolve(this.image);
            this.image.src = this.SRC;
        });
    }

    draw_card(ctx, i, ...args) {
        let col = i % this.COLUMNS;
        let row = Math.floor(i / this.COLUMNS);

        let sx = this.START_X + col * this.STRIDE_X;
        let sy = this.START_Y + row * this.STRIDE_Y;

        ctx.drawImage(
            this.image,
            // sx, sy, swidth, sheight,
            sx, sy, this.WIDTH, this.HEIGHT,
            // dx, dy, dwidth, dheight
            ...args
        );
    }
}


class ArrayDriver {
    constructor(array, stacks = true) {
        this.hand = array;
        // Whether the piles behave like stacks, rather than queues.
        this.stacks = stacks;
    }

    start_phase(_) {
    }

    deal(layout) {
        let hand = this.hand;
        let table = [];

        while (layout.length > 0) {
            let pile_idx = layout.shift();
            while (pile_idx >= table.length) {
                table.push([]);
            }
            let e = hand.shift();
            if (this.stacks) {
                table[pile_idx].unshift(e);
            } else {
                table[pile_idx].push(e);
            }            
        }

        table.forEach((pile) => hand.push(...pile));
    }
}


class HistoryDriver {

    constructor(hand, stacks = true) {
        this.hand = hand;
        this.driver = new ArrayDriver(hand, stacks);
        this.history = [];
    }

    start_phase(_) {
    }

    deal(pile_seq) {
        let event = {};

        event.hand_in = [...this.driver.hand];
        event.deal = [...pile_seq];
        this.driver.deal(pile_seq);
        event.hand_out = [...this.driver.hand];
        this.history.push(event);
    }
}


var app = new App();
app.main();


// Demo.
class Driver {

    start_phase(phase_idx) {
        // console.log(phase_idx);
    }

    deal(pile_seq) {
        console.log(rollup(pile_seq.map((i) => i + 1), 5));
    }

    debug(whatever) {
        console.log(whatever);
    }
}


function range(n) {
    return [...Array(n).keys()]
}


function rollup(arr, m) {
    // Reshape [any] * n -> [[any] * m] * ceil(n / m)
    let result = [];
    let buff = [];

    for (let k=0; k < arr.length; k++) {
        buff.push(arr[k]);
        if (k % m == (m - 1)) {
            result.push(buff);
            buff = [];
        }
    }
    if (buff.length > 0) {
        result.push(buff);
    }
    return result;
}


if (false) {
    let cards = [];
    cards.push(..."AKQJ", "10", ..."98765432");
    
    let shuffler = new PileShuffle(5);
    let perm = Permutations.random(30);
    
    // let driver = shuffler.wrap(arr);
    let driver = new Driver();
    
    console.log("shuffle")
    shuffler.shuffle(perm, driver);
    // let shuffled = Permutations.sample([...cards].reverse(), perm);
    if (false) {
        let shuffled = Permutations.sample(cards, perm);
        console.log(shuffled);    
    }
    
    console.log("deshuffle")
    shuffler.deshuffle(perm, driver);    
}


function assignPiles(perm) {
    // do reverse next.
    let match = []; match.length = perm.length;
    let piles = [];

    for (let i=0; i < perm.length; i++) {
        let e = perm[i];

        // find pile for e
        // TODO: This is not very efficient.
        var pileIndex;
        for (pileIndex=0; pileIndex < piles.length; pileIndex++) {
            let pile = piles[pileIndex];
            if (e == pile[pile.length - 1] + 1) {
                break;
            }
        }
        if (pileIndex == piles.length) {
            piles.push([]);
        }

        match[e] = pileIndex;
        piles[pileIndex].push(e);
    }

    return {
        match: match,
        piles: piles
    };
}


function compressOrder(arr) {
    // Return a permutation (i.e., on {0..n-1}) with the same ordering as input array.
    let arr_ = arr.map((e, i) => [e, i]);
    sortNumeric(arr_, t => t[0]);  // wow... that was quite a bug...
    let pi = arr_.map(e => e[1]);
    return Permutations.get_inverse(pi);
}


class PilesHelper {
    // TODO: Really, we just need to pull this into PileShuffle directly.

    constructor(n_piles, reversing=true) {
        assert (Number.isInteger(n_piles) && n_piles >= 0);
        this.n_piles = n_piles;

        assert (reversing === false || reversing === true);
        this.reversing = reversing;
    }

    getNaiveNumPhases(n_cards) {
        // Same for all perms of particular length; all modes.
        return new bAry(this.n_piles).ceilLogk(n_cards);
    }

    getPileIndex(e, phase_idx, n_phases) {
        // e is the place idx;
        // regular permutation element in naive shuffle
        // or index of a "super pile" in optimal shuffle

        assert (phase_idx < n_phases);

        let E = new bAry(this.n_piles).repr(e);
        let pile_idx = (phase_idx < E.length ? E[phase_idx] : 0);

        if (this.reversing && (n_phases - phase_idx) % 2 == 0) {
            pile_idx = (this.n_piles - 1) - pile_idx;
        }

        return pile_idx;
    }

    getShuffleGuide(perm) {
        let cls = this.constructor;  // for static method calls

        let piling = assignPiles(perm);
        let n_phases;

        if (this.reversing) {
            let reversePiling = assignPiles([...perm].reverse());
            n_phases = Math.min(
                cls.nextEvenInteger(this.getNaiveNumPhases(piling.piles.length)),
                cls.nextOddInteger(this.getNaiveNumPhases(reversePiling.piles.length))
            );

            if (!cls.isEven(n_phases)) {
                piling = reversePiling;  // With odd n_phases, we make piles of the reverse perm.
            }
        }

        else {
            n_phases = this.getNaiveNumPhases(piling.piles.length);
        }

        // Re-number the piles.
        // TODO: In principle, we could maintain order during construction instead.
        piling = cls.reNumberPiles(piling);

        // TODO: Also, we can/_should_ balance into surplus piles if we're not using them all!

        let match = piling.match;

        // Interesting... from here we don't really need the permutation anymore.
        let guide = range(n_phases).map(e => []);
        for (let e=0; e < perm.length; e++) {
            let e_ = match[e];  // this is the "super pile" that it belongs to.
            for (let phase_idx=0; phase_idx < n_phases; phase_idx++) {
                guide[phase_idx].push(
                    // TODO: Optimize.
                    // (That is, we are redundantly computing the number representation.)
                    this.getPileIndex(e_, phase_idx, n_phases)
                );
            }
        }

        return guide;
    }

    static isEven(n) {
        return n % 2 == 0;
    }

    static nextEvenInteger(n) {
        return this.isEven(n) ? n : n + 1;
    }

    static nextOddInteger(n) {
        return this.isEven(n) ? n + 1 : n;
    }

    static reNumberPiles(piling) {
        // Re-order the piles so i < j => pile i contents < pile j contents
        let starts = piling.piles.map(arr => arr[0]);
        let pileMap = compressOrder(starts);
        let match_ = piling.match.map(old_pile => pileMap[old_pile]);
        let piles_ = Array(pileMap.length);
        pileMap.forEach((new_pile, old_pile) => piles_[new_pile] = piling.piles[old_pile]);
        return {
            match: match_,
            piles: piles_,
        };
    }
}


class ShuffleGuideExecutor {

    constructor(guide, stacks = true) {
        // The "guide" is a nested array.
        // The outer dimension contains a list per phase of the shuffle.
        // Each phase's list maps from a permutation element (index into the list)
        // to the pile the element should be placed into.
        this.guide = guide;
        this.stacks = stacks;
    }

    executeShuffle(permutation, driver) {
        // Blindly execute the "guide" against the given shuffle driver.
        let n_phases = this.guide.length;

        let driver_ = new ArrayDriver([...permutation], this.stacks);
        for (let phase_idx=0; phase_idx < n_phases; phase_idx++) {
            driver.start_phase(phase_idx);

            let layout = driver_.hand.map(e => this.guide[phase_idx][e]);

            driver.deal([...layout]);
            driver_.deal(layout);
        }
    }
}




stacks = true;
ph = new PilesHelper(5, stacks);

perm = Permutations.random(50);
// perm = [8,6,9,0,5, 2,3,1,10,7, 4];

// perm = [3, 2, 1, 0];
// piling = assignPiles(perm);
// piling_ = PilesHelper.reNumberPiles(piling);

guide = ph.getShuffleGuide(perm, stacks);
shuffler = new ShuffleGuideExecutor(guide, stacks);
driver = new HistoryDriver([...perm], stacks=stacks);
shuffler.executeShuffle(perm, driver);


n_phases = driver.history.length;
console.log(n_phases);
assert(isOrdered(driver.history[n_phases - 1].hand_out));
