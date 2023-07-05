import { storage } from "@forge/api"
import ForgeUI, { useEffect, useState, Code, Fragment, Form, Heading, SectionMessage, Tab, Text, Toggle } from "@forge/ui"

export default function DebugLog() {
    const [debug, setDebug] = useState({})
    const submitForm = async formData => {
        await storage.set("debug", {
            debugOption: formData.debug,
            debugLog: formData.log ? [] : debug.debugLog
        })

        setDebug({
            debugOption: formData.debug,
            debugLog: formData.log ? [] : debug.debugLog
        })
    }

    useEffect(async () => {
        const debugRaw = await storage.get("debug")

        setDebug(debugRaw ? debugRaw : {
            debugOption: false,
            debugLog: []
        })
    }, [])

    return (
        <Tab label="Debug Log">
            <SectionMessage title="About">
                <Text>
                    This is for debugging the Tool.
                    Enable it below, then it will log alot of information.
                </Text>
            </SectionMessage>
            <Form onSubmit={submitForm}>
                <Toggle label="Debug Enable/Disable" name="debug" defaultChecked={debug.debugOption} />
                <Toggle label="Clear Log" name="log" />
            </Form>
            {debug?.debugLog && debug.debugLog.length > 0 && (
                <Fragment>
                    <Heading>Log Entries</Heading>
                    {debug.debugLog.map(log => (
                        <Code text={log} />
                    ))}
                </Fragment>
            )}
        </Tab>
    )
}