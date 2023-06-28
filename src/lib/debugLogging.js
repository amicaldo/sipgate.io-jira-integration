import { storage } from "@forge/api"

export default async function debugLogging(debugOption, debugLog, logArray) {
    if (debugOption) {
        logArray.forEach(log => {
            debugLog.push(log)

            console.log(log)
        })

        await storage.set("debug", {debugOption, debugLog})
    }
}