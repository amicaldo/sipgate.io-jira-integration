import api, { route, startsWith, storage, webTrigger } from "@forge/api"
import ForgeUI, { render, AdminPage, useState, useEffect, Code, Fragment, Tab, Tabs, Text} from "@forge/ui"
import IssueConfiguration from "./tabs/issueConfiguration"
import UserConfiguration from "./tabs/userConfiguration"

function App() {
    const [debug, setDebug] = useState({})

    useEffect(async () => {
        const issueConfiguration = await storage.get("issueConfiguration")
        const debugOption = await storage.get("debugOption")
        const debugLog = await storage.get("debugLog")

        setDebug({
            issueConfiguration,
            debugOption,
            debugLog
        })
    }, [])

    return (
        <Fragment>
            <Text>
                {"Welcome to the configuration UI for your Sipgate + JIRA integration by amicaldo.\nWe will create one ticket for each incomming call.\nHere, you can customize the format of each ticket created for incoming calls."}
            </Text>
            <Tabs>
                <IssueConfiguration />
                <UserConfiguration />
                <Tab label="DEBUG">
                    <Code text={JSON.stringify(debug, null, 4)} />
                </Tab>
            </Tabs>
        </Fragment>
    )
}

export const run = render(
    <AdminPage>
        <App />
    </AdminPage>
)
