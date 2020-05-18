import * as child_process from "child_process";
import { formatTime, p, formatPercent } from "./format";

import * as preact from "preact";
//import { observer } from "mobx-preact";
//import { observable, configure } from "mobx";

import { normalci } from "jstat";

import "./index.less";

//configure({ reactionScheduler: (callback) => Promise.resolve().then(callback) });

const bucketScaleExponent = 1.5;
const confidence = 0.95;
const mainBucketCount = 10;

interface Dist {
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

function confidenceInterval(dist: Dist, confidence: number): { min: number, max: number, range: number, mean: number; halfRange: number } {
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
function addDist(base: Dist, newDist: Dist): void {
    base.count += newDist.count;
    base.sum += newDist.sum;
    base.squareSum += newDist.squareSum;

    let conf = confidenceInterval(base, confidence);
    base.min = conf.min;
    base.max = conf.max;
    base.mean = conf.mean;
}
function addDistValue(base: Dist, value: number): void {
    base.count++;
    base.sum += value;
    base.squareSum += value * value;

    let conf = confidenceInterval(base, confidence);
    base.min = conf.min;
    base.max = conf.max;
    base.mean = conf.mean;
}
function defaultDist(): Dist {
    return {
        count: 0,
        squareSum: 0,
        sum: 0,
        min: 0,
        max: 0,
        mean: 0,
    };
}



let process = child_process.spawn("powershell");
let pendingData = "";
process.stdout.on("data", data => {
    pendingData += data.toString();
    while(true) {
        let lineIndex = pendingData.indexOf("\n");
        if(lineIndex < 0) break;
        let line = pendingData.slice(0, lineIndex);
        line = line.replace(/\r/g, "");
        pendingData = pendingData.slice(lineIndex + 1);
        onCounterLine(line);
    }
});




//todonext;
// Hmm... this code is too slow. Maybe... do a kind of bucketing system... where we only move entire buckets at once?
//  Hmm... Yeah, actually... arbitrary heights of blocks is fine... uh... yeah, that works... everything shifts back,
//  but... if it is logarithmic... eventually the shifts become so small it doens't matter...


let timeBuckets: {
    maxSize: number;
    dist: Dist;
}[] = [];
let mainTimes: number[] = [];
timeBuckets.push({
    maxSize: mainBucketCount,
    dist: defaultDist(),
});


let mainComponent: MainComponent|undefined;

function onCounterLine(line: string) {
    let usage = +line;
    // Because the numbers don't come from javascript, we can't just see if usage.toString() === line.trim(),
    //  because we could be given valid numbers that simply have a different representation in javascript than in C#.
    if(isNaN(usage) || usage === 0 && !line.includes("0.00000")) return;
    usage = usage / 100;

    // More numbers, for debugging.
    //for(let i = 0; i < 7; i++)
    {
        mainTimes.unshift(usage);
        while(mainTimes.length > mainBucketCount) {
            mainTimes.pop();
        }

        let pos = 0;
        let distToAdd = defaultDist();
        addDistValue(distToAdd, usage);
        while(pos < timeBuckets.length && distToAdd.count > 0) {
            let bucket = timeBuckets[pos++];
            if(bucket.dist.count + distToAdd.count > bucket.maxSize) {
                let temp = bucket.dist;
                bucket.dist = distToAdd;
                distToAdd = temp;
            } else {
                addDist(bucket.dist, distToAdd);
                distToAdd = defaultDist();
                break;
            }
        }

        if(distToAdd.count > 0) {
            let maxSize = Math.ceil(timeBuckets[timeBuckets.length - 1].maxSize * bucketScaleExponent);
            timeBuckets.push({
                maxSize,
                dist: distToAdd,
            });
        }
    }

    mainComponent?.forceUpdate();
}

process.stdin.write(`Get-Counter -Counter "\\Processor(_Total)\\% Processor Time" -Continuous \n`);


class BackgroundBar extends preact.Component<{
    start: number;
    end: number;
    color: string;
}, {}> {
    render() {
        let { start, end, color } = this.props;
        return (
            <preact.Fragment>
                <div
                    style={{
                        position: "relative",
                        width: "100%",
                        height: "100%"
                    }}
                    className="BackgroundBar"
                >
                    <div
                        style={{
                            position: "relative",
                            "z-index": 1,
                            width: "100%",
                            height: "100%"
                        }}
                    >
                        {this.props.children}
                    </div>
                    <div
                        style={{
                            position: "absolute",
                            left: p(start),
                            width: p(end - start),
                            background: color,
                            top: "0%",
                            height: "100%",
                        }}
                        className="BackgroundBar-bar"
                    ></div>
                </div>
            </preact.Fragment>
        )
    }
}

function getStatusColor(fraction: number) {
    fraction = fraction;
    let gamma = 4;
    let total = 255 ** gamma;
    let r = total * fraction;
    let g = total * (1 - fraction);
    r = r ** (1/gamma);
    g = g ** (1/gamma);
    return `rgb(${r}, ${g}, 0)`;
    //let sat = fraction > 0.4 ? 100 : 75;
    //return `hsl(${100 - fraction * 100}, ${sat}%, ${75 - fraction * 25}%)`;
}

class MainComponent extends preact.Component<{}, {}> {
    constructor() {
        super(...arguments);

        mainComponent = this;
    }
    render() {


        let mainDist = defaultDist();
        for(let mainNum of mainTimes) {
            addDistValue(mainDist, mainNum);
        }

        let recentInterval = confidenceInterval(mainDist, confidence);
        let min = recentInterval?.min || 0;
        let max = recentInterval?.max || 0;

        let pos = mainBucketCount;

        return (
            <div>
                <title>CPU Usage&nbsp;&nbsp;&nbsp;&nbsp;{formatPercent(min)} — {formatPercent(max)}</title>
                {/*Array(101).fill(0).map((x, i) =>
                    <div style={{color: getStatusColor(i / 100)}}>{i.toString()}, {getStatusColor(i / 100)}</div>
                )*/}
                {<div className="MainTextHolder">
                    <div
                        className="MainText"
                    >
                        <span style={{color: getStatusColor(min)}}>{formatPercent(min)}</span>
                        <span style={{color: getStatusColor(min * 0.5 + max * 0.5)}}>{" — "}</span>
                        <span style={{color: getStatusColor(min)}}>{formatPercent(max)}</span>
                    </div>
                    <div
                        className="MainLine"
                    >
                        <BackgroundBar
                            start={min}
                            end={max}
                            color={getStatusColor(recentInterval.mean)}
                        ></BackgroundBar>
                    </div>
                </div>}

                {
                    // The first is already display in the main time section. And if we displayed it here it would
                    //  keep going from 10 to 1, which makes the variance vary by too much... which looks bad (and we
                    //  are already displaying the numbers, so it is fine, not to display them again. It just means
                    //  sometimes we represents numbers in two places at once, which is worst when the first intervals overflows,
                    //  but... it shouldn't be too noticeable).
                    timeBuckets.slice(1).map((interval, i) => {
                        pos += interval.dist.count;
                        if(interval.dist.count === 0) return undefined;
                        return (
                            <div
                                className="SubLine"
                            >
                                <BackgroundBar
                                    start={interval.dist.min}
                                    end={interval.dist.max}
                                    color={getStatusColor(interval.dist.mean)}
                                ></BackgroundBar>
                                <div className="SubLine-label-before">
                                    {i % 2 === 0 && formatTime(pos * 1000)}
                                </div>
                                <div className="SubLine-label-after">
                                    {i % 2 === 0 && formatTime(pos * 1000)}
                                </div>
                            </div>
                        );
                    })
                }
            </div>
        );
    }
}


preact.render(
    <body><MainComponent /></body>,
    document.body
);


//process.stdin.write("ping 1.1.1.1\n");

//import * as Shell from "node-powershell";

/*
let ps = new Shell.default({
    executionPolicy: "Bypass",
    noProfile: true
});

(async () => {
    let result = await ps.addCommand("ping 1.1.1.1");
    console.log(result);
    ps.on("output", (data) => {
        console.log({data});
    });
    await ps.invoke();
    console.log("done");
    //console.log();
})();
*/