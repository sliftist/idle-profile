import { normalci } from "jstat";

export const confidence = 0.95;

export interface Dist {
    count: number;
    sum: number;
    /** Each value, squared, then that summed */
    squareSum: number;
    // standard deviation = (squareSum / count - (sum / count)**2)**0.5
    //  (roughly, there are some corrections for sample variance, but our distribution doesn't actually follow a normal distribution
    //  anyway, so this is the least of our concerns).
    min: number;
    max: number;
    mean: number;
}

export function confidenceInterval(dist: Dist, confidence: number): { min: number, max: number, range: number, mean: number; halfRange: number } {
    if(dist.count === 1 && dist.squareSum === dist.sum ** 2) {
        return {
            mean: dist.sum,
            min: 0,
            max: 0,
            range: Number.POSITIVE_INFINITY,
            halfRange: Number.POSITIVE_INFINITY,
        };
    }
    let mean = dist.sum / dist.count;
    let stdSquared = (dist.squareSum / dist.count - (dist.sum / dist.count)**2);
    // Square root doesn't work well with very very small numbers, so just set it to 0.
    let std = stdSquared < 0.000000000001 ? 0 : stdSquared**0.5;

    let range = normalci(mean, 1 - confidence, std, dist.count);
    let diff = range[1] - range[0];
    return {
        min: range[0],
        max: range[1],
        range: diff,
        mean,
        halfRange: diff / 2,
    };
}
export function addDist(base: Dist, newDist: Dist): void {
    base.count += newDist.count;
    base.sum += newDist.sum;
    base.squareSum += newDist.squareSum;

    let conf = confidenceInterval(base, confidence);
    base.min = conf.min;
    base.max = conf.max;
    base.mean = conf.mean;
}
export function addDistValue(base: Dist, value: number): void {
    base.count++;
    base.sum += value;
    base.squareSum += value * value;

    let conf = confidenceInterval(base, confidence);
    base.min = conf.min;
    base.max = conf.max;
    base.mean = conf.mean;
}
export function defaultDist(): Dist {
    return {
        count: 0,
        squareSum: 0,
        sum: 0,
        min: 0,
        max: 0,
        mean: 0,
    };
}