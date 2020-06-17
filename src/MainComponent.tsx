import * as preact from "preact";
import { defaultDist, addDistValue, confidenceInterval, confidence } from "./stats";
import { formatPercent, formatTime } from "./format";
import { mainBucketCount, timeBuckets, mainTimes } from "./timeBuckets";
import { BackgroundBar } from "./BackgroundBar";

let mainComponent: MainComponent|undefined;
export function getMainComponentInstance() {
    return mainComponent;
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

export class MainComponent extends preact.Component<{}, {}> {
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
                <title>{formatPercent(min).slice(0, -1)}-{formatPercent(max)}</title>
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