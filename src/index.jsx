import ForgeUI, { render, AdminPage, Tabs, Text } from "@forge/ui"
import IssueConfiguration from "./tabs/issueConfiguration"
import UserConfiguration from "./tabs/userConfiguration"
import WebhookGenerator from "./tabs/webhookGenerator"

export const run = render(
    <AdminPage>
        <Text>
            {"Welcome to the configuration UI for your Sipgate + JIRA integration by amicaldo.\nWe will create one ticket for each incomming call.\nHere, you can customize the format of each ticket created for incoming calls."}
        </Text>
        <Tabs>
            <IssueConfiguration />
            <UserConfiguration />
            <WebhookGenerator />
        </Tabs>
    </AdminPage>
)
