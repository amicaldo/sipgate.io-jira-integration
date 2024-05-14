import { webTrigger } from "@forge/api"
import ForgeUI, { useState, Fragment, Form, Heading, SectionMessage, Strong, Tab, Text, TextField } from "@forge/ui"

export default function WebhookGenerator() {
    const [webTriggerURL, setWebTriggerURL] = useState("")
    const generateURL = async formData => {
        var onSipgateReturnURL = await webTrigger.getUrl("sipgateReturn")
        onSipgateReturnURL += `?project=${formData.projectID}&phoneField=${formData.cField1}&issueID=${formData.issueID}&closeID=${formData.closeID}&webhookEvent=onIncommingCall`

        setWebTriggerURL(onSipgateReturnURL)
    }

    return (
        <Tab label="Sipgate Webhook Generator">
            <SectionMessage title="About">
                <Text>
                    <strong>Welcome to the Sipgate webhook generator!</strong> This tool enables you to configure webhooks for each user and line in your Sipgate account, allowing you to create tickets in your selected project when a call is received.
                </Text>
                <Text>
                    Before utilizing this tool, you'll need to purchase the sipgate.io product from Sipgate. Once acquired, you can configure a webhook.
                    Please set the webhook URL here: https://app.sipgate.com/io/hooks. Make sure to select the value "all" for "Sources".
                </Text>
                <Text>
                    After completing the form, simply click the submit button to generate your webhook link. You can then copy and paste this link into your Sipgate account settings to activate the webhook.
                </Text>
                <Text>
                    To generate a webhook link, please complete the form below. No data is stored; it's just a helper to create a link.
                </Text>
            </SectionMessage>
            <Form onSubmit={generateURL}>
                <TextField
                    title="projectKey"
                    name="projectID"
                    placeholder="CALL"
                    label="Project Key"
                    isRequired
                    type="text"
                    description={"This is the key of the project that you want to create tickets in when a call comes in. This field is required."}
                />
                <TextField
                    title="cField1"
                    name="cField1"
                    label="Phonenumber - Customfield ID"
                    isRequired
                    type="number"
                    description={"This is the ID of the customfield (in JIRA) where you want to store the telephone number of the incoming call. This field is required and must be a number. Please check if the field is assigned to the project."}
                />
                <TextField
                    title="issueID"
                    name="issueID"
                    label="Issue type ID"
                    isRequired
                    type="number"
                    description={"This is the ID of the issue type that you want to create for the incoming call. This field is required and must be a number. Please check if the issue type is assined to the project."}
                />
                <TextField
                    title="closeID"
                    name="closeID"
                    label="Workflow trigger id"
                    isRequired
                    type="number"
                    description={"This field specifies the workflow trigger to execute onHangup. Usually its an close action to move issues from open to done after a call is completed. Enter 0 if not required."}
                />
            </Form>
            {webTriggerURL && (
                <Fragment>
                    <Heading>Webhook URL for Sipgate</Heading>
                    <Text>{webTriggerURL}</Text>
                </Fragment>
            )}
        </Tab>
    )
}
