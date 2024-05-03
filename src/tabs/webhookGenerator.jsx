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
                    <Strong>Welcome to the Sipgate webhook generator!</Strong> This tool allows you to configure webhooks for each user and line in your Sipgate account, which can be used to create tickets in your chosen project when a call comes in.
                </Text>
                <Text>
                    Before you can use this tool, you'll need to purchase the sipgate.io product from Sipgate. Once you've done that, you can configure a webhook for each user and line individually.
                    Please note that you can configure different projects for different incoming queues in your Sipgate account. Additionally, you can set different issue types for different lines or users, which can be useful if you want to create different types of tickets depending on who is receiving the call.
                </Text>
                <Text>
                    Once you've filled out the form, click the submit button to generate your webhook link. You can then copy and paste this link into your Sipgate account settings to activate the webhook.
                </Text>
                <Text>
                    To generate a webhook link, please fill out the form below. No data is stored its just the helper to create an link:
                </Text>
            </SectionMessage>
            <Form onSubmit={generateURL}>
                <TextField
                    title="projectKey"
                    name="projectID"
                    isRequired
                    type="text"
                    description={"This is the key of the project that you want to create tickets in when a call comes in. This field is required."}
                />
                <TextField
                    title="cField1"
                    name="cField1"
                    isRequired
                    type="number"
                    description={"This is the ID of the field where you want to store the telephone number of the incoming call. This field is required and must be a number."}
                />
                <TextField
                    title="issueID"
                    name="issueID"
                    isRequired
                    type="number"
                    description={"This is the ID of the issue type that you want to create for the incoming call. This field is required and must be a number."}
                />
                <TextField
                    title="closeID"
                    name="closeID"
                    isRequired
                    type="number"
                    description={"This field specifies the workflow trigger to execute onHangup."}
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
