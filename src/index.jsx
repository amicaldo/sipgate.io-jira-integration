import ForgeUI, { render, AdminPage, Tabs, Text } from "@forge/ui"
import WebhookGenerator from "./tabs/webhookGenerator"
import IssueConfiguration from "./tabs/issueConfiguration"
import CallLogConfiguration from "./tabs/callLogConfiguration"
import UserConfiguration from "./tabs/userConfiguration"
import JQLConfiguration from "./tabs/jqlConfiguration"
import DebugLog from "./tabs/debugLog"

export const run = render(
    <AdminPage>
        <Text>
            {"Welcome to the configuration UI for your Sipgate + JIRA integration by amicaldo.\nWe will create one ticket for each incomming call.\nHere, you can customize the format of each ticket created for incoming calls."}
        </Text>
        <Tabs>
            <IssueConfiguration />
            <CallLogConfiguration />
            <UserConfiguration />
            <JQLConfiguration />
            <WebhookGenerator />
            <DebugLog />
        </Tabs>
    </AdminPage>
)
