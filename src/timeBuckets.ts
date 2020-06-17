import { Dist, defaultDist, addDistValue, addDist } from "./stats";
import { getMainComponentInstance } from "./MainComponent";
import { spawnProcess } from "./getProcessTimeLoop";

const bucketScaleExponent = 1.5;
export const mainBucketCount = 10;

export let timeBuckets: {
    maxSize: number;
    dist: Dist;
}[] = [];
export let mainTimes: number[] = [];
timeBuckets.push({
    maxSize: mainBucketCount,
    dist: defaultDist(),
});

let lastCounterLineTime = Date.now();
setInterval(() => {
    let curTime = Date.now();
    let timeSinceLastLine = curTime - lastCounterLineTime;
    if(timeSinceLastLine > 1000 * 60 * 5) {
        timeSinceLastLine = curTime;
        console.error(`We stopped getting output from powershell (nothing in the last 5 minutes)? Killing the process and starting a new one. ` + new Date());
        spawnProcess();
    }
}, 60 * 1000);

export function onCounterLine(line: string) {
    lastCounterLineTime = Date.now();

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

    getMainComponentInstance()?.forceUpdate();
}