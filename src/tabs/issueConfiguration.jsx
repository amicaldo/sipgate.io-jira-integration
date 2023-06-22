import ForgeUI, { Form, Heading, SectionMessage, Strong, Tab, Text, TextArea, TextField } from "@forge/ui"

export default function IssueConfiguration() {
    return (
        <Tab label="Issue Configuration">
            <SectionMessage title="About">
                <Text>
                    {"This tab allows you to configure the issue design.\nHere you can configure the tool output and settings"}
                </Text>
            </SectionMessage>
            <SectionMessage title="Warning" appearance="warning">
                <Text>
                    {"You need to atleast confirm these settings ONCE, so the API knows what text, timezone and more it should work with.\nIf these settings are not confirmed, it will not work!"}
                </Text>
            </SectionMessage>
            <Heading size="large">
                {"Standard configurations"}
            </Heading>
            <Form>
                <TextField
                    label="Timezone"
                    name="timezone"
                    isRequired
                    type="text"
                    defaultValue="Europe/Berlin"
                />
                <TextField
                    label="Hour format"
                    name="hourFormat"
                    isRequired
                    type="text"
                    defaultValue="HH:mm:ss"
                />
                <TextField
                    label="Date format"
                    name="dateFormat"
                    isRequired
                    type="text"
                    defaultValue="DD:MM:YYYY"
                />
                <TextField
                    label="Sipgate Number"
                    name="sipgateNumber"
                    isRequired
                    type="text"
                    description={`Your sipgater number without the last digit.\nExample: "492111234567" where the last digit "7" is representing the sipgate line, that was called.`}
                />
            </Form>
            <Heading size="large">
                {"None configuriable fields"}
            </Heading>
            <Text>
                <Strong>{"{{$number}}: "}</Strong>
                {"This variable will be replaced with the calling number."}
            </Text>
            <Text>
                <Strong>{"{{$date}}: "}</Strong>
                {"This variable will be replaced with the date of the action, formated in the configured way."}
            </Text>
            <Text>
                <Strong>{"{{$time}}: "}</Strong>
                {"This variable will be replaced with the time of the action, formated in the configured way."}
            </Text>
            <Text>
                <Strong>{"{{$sipgateNumber}}: "}</Strong>
                {"This variable will be replaced with the called number, but only the last digit, based on configuration."}
            </Text>
            <Heading size="large">
                {"Configuriable fields"}
            </Heading>
            <Form>
                <TextArea
                    label="{{$spamRatingField}}"
                    name="spamRatingField"
                    isRequired
                    description={`This field specifies the spam rating for the number.`}
                />
                <TextArea
                    label="{{$cityField}}"
                    name="cityField"
                    isRequired
                    description={`This field specifies the caller's city for the ticket.`}
                />
                <TextArea
                    label="{{$timeField}}"
                    name="timeField"
                    isRequired
                    description={`This field specifies what ending will come after the time.`}
                />
            </Form>
            <Form>
                <TextArea
                    label="{{$summary}}"
                    name="summary"
                    isRequired
                    description={`The issue summary.`}
                />
                <TextArea
                    label="{{$description}}"
                    name="description"
                    isRequired
                    description={`The issue description.`}
                />
            </Form>
        </Tab>
    )
}