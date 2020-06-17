import * as preact from "preact";
import { p } from "./format";

export class BackgroundBar extends preact.Component<{
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