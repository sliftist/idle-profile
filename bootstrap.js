#!/usr/bin/env node

require("child_process").execSync("yarn electron ./boot.js", { stdio: "inherit", cwd: __dirname });