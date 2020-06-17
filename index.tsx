import * as preact from "preact";

import "./index.less";
import { spawnProcess } from "./src/getProcessTimeLoop";
import { MainComponent } from "./src/MainComponent";


window.addEventListener("keypress", (e) => {
    if(e.code === "KeyI" && e.ctrlKey && e.shiftKey) {
        require("electron").remote.getCurrentWindow().toggleDevTools();
    }
});


spawnProcess();


preact.render(
    <body><MainComponent /></body>,
    document.body
);