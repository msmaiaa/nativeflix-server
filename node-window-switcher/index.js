const util = require('util');
const exec = util.promisify(require("child_process").exec);
const path = require("path");

var windowsFocusManagementBinary = path.join(
  __dirname,
  "windows-console-app",
  "windows-console-app",
  "bin",
  "Release",
  "windows-console-app.exe"
);

var isWindows = process.platform === "win32";

/**
 * @typedef {{ProcessId?: number, MainWindowTitle?: string, ProcessName?: string}} ProcessInfo
 */

/**
 * Get list of processes that are currently running
 *
 */
async function getProcesses() {
  if (!isWindows) {
    throw new Error("Non-Windows platforms are currently not supported");
  }

  return await executeProcess("--list");
}


/**
 * Focus a windows
 * Process can be a number (PID), name (process name or window title),
 * or a process object returning from getProcesses
 *
 * @param {number|string|ProcessInfo} process
 */
async function focusWindow(process) {
  if (!isWindows) {
    throw "Non-windows platforms are currently not supported";
  }

  if (process === null) return;

  if (typeof process === "number") {
    return await executeProcess(`--focus --pid ${process.toString()}`);
  } else if (typeof process === "string") {
    return await executeProcess(`--focus --name ${process.toString()}`);
  } else if (
    process.ProcessId ||
    process.MainWindowTitle ||
    process.ProcessName
  ) {
    let command = "--focus";
    if (process.ProcessId) {
      command += ` --pid ${process.ProcessId}`;
    }
    if (process.MainWindowTitle) {
      command += ` --name ${process.MainWindowTitle}`;
    }
    if (process.ProcessName) {
      command += ` --class ${process.ProcessName}`;
    }
    return await executeProcess(command);
  }
}

/**
 * Helper method to execute the C# process that wraps the native focus / window APIs
 */
async function executeProcess(arg) {
  const { error, stdout, stderr } = await exec(windowsFocusManagementBinary + " " + arg);
  if (error) {
    throw new Error(error);
  }

  if (stderr) {
    throw new Error(stderr);
  }

  /** @type {ProcessInfo[]} */
  let returnObject = JSON.parse(stdout);
  return returnObject;
}

module.exports = {
  getProcesses: getProcesses,
  focusWindow: focusWindow
};
