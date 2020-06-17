import * as child_process from "child_process";
import { onCounterLine } from "./timeBuckets";

let activeProcess: child_process.ChildProcessWithoutNullStreams|undefined;
export function spawnProcess() {
    if(activeProcess) {
        try {
            activeProcess.kill();
        } catch(e) {
            console.error(`Erroring when killing process. Ignoring error and continuing`, e);
        }
    }
    let ourProcess = child_process.spawn("powershell");
    activeProcess = ourProcess;
    let pendingData = "";
    ourProcess.stdout.on("data", data => {
        if(ourProcess !== activeProcess) {
            ourProcess.kill();
            return;
        }
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

    ourProcess.on("error", e => {
        console.error("processs error", e);
    });

    ourProcess.on("close", () => {
        console.error(`process closed at ${(new Date()).toString()}. Restarting`);
        if(ourProcess === activeProcess) {
            spawnProcess();
        }
    });

    ourProcess.stdin.write(`Get-Counter -Counter "\\Processor(_Total)\\% Processor Time" -Continuous \n`);
}