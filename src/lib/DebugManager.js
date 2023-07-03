import { storage } from "@forge/api"

export default class DebugManager {
    async log({debugOption, debugLog}, logArray) {
        if (debugOption) {
            logArray.forEach(log => {
                debugLog.push(log)

                console.log(log)
            })
        }

        await storage.set("debug", {debugOption, debugLog})
    }
}