import { storage } from "@forge/api"
import ForgeUI, { useEffect, useState, Form, Heading, Link, SectionMessage, Strong, Tab, Text, TextArea, TextField, Toggle } from "@forge/ui"

export default function IssueConfiguration() {
    const [issueConfiguration, setIssueConfiguration] = useState({})
    const submitForm = async formData => {
        setIssueConfiguration({
            ...issueConfiguration,
            ...formData
        })

        await storage.set("issueConfiguration", {
            ...issueConfiguration,
            ...formData
        })
    }

    useEffect(async () => {
        const issueConfigurationRaw = await storage.get("issueConfiguration")

        setIssueConfiguration({
            timezone: issueConfigurationRaw?.timezone ? issueConfigurationRaw.timezone : "Europe/Berlin",
            hourFormat: issueConfigurationRaw?.hourFormat ? issueConfigurationRaw.hourFormat : "HH:mm:ss",
            dateFormat: issueConfigurationRaw?.dateFormat ? issueConfigurationRaw.dateFormat : "DD.MM.YYYY",
            sipgateNumber: issueConfigurationRaw?.sipgateNumber ? issueConfigurationRaw.sipgateNumber : "",
            spamRatingField: issueConfigurationRaw?.spamRatingField ? issueConfigurationRaw.spamRatingField : " (Rating: {{$rating}})",
            cityField: issueConfigurationRaw?.cityField ? issueConfigurationRaw.cityField : " from {{$city}}",
            timeField: issueConfigurationRaw?.timeField ? issueConfigurationRaw.timeField : "{{$time}}",
            summary: issueConfigurationRaw?.summary ? issueConfigurationRaw.summary : "Call from {{$number}}{{$spamRatingField}}{{$cityField}} - {{$date}} - {{$timeField}}",
            description: issueConfigurationRaw?.description ? issueConfigurationRaw.description : "",
            tellows: issueConfigurationRaw && typeof issueConfigurationRaw.tellows === "boolean" ? issueConfigurationRaw.tellows : false
        })
    }, [])

    return (
        <Tab label="Issue Configuration">
            <SectionMessage title="About">
                <Text>
                    {"This tab allows you to configure the issue design.\nHere you can configure the tool output and settings."}
                </Text>
                <Text>
                {"This is Version 4.10.0 of the App."}
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
            <Text>
                We use <Link href="https://day.js.org/docs/en/display/format" openNewTab={true}>DayJS</Link> for formatting the time and date.
            </Text>
            <Form onSubmit={submitForm}>
                <Toggle label="Tellows Opt-In" name="tellows" defaultChecked={issueConfiguration.tellows} />
                <Text>By activating this checkbox phone numbers of incoming calls are processed by tellows UG (limited liability). <Link href="https://www.tellows.de/s/about-de/datenschutz" openNewTab={true}>Here you can find the privacy policy of tellows UG.</Link></Text>
                <TextField
                    label="Timezone"
                    name="timezone"
                    isRequired
                    type="text"
                    defaultValue={issueConfiguration.timezone}
                />
                <TextField
                    label="Hour format"
                    name="hourFormat"
                    isRequired
                    type="text"
                    defaultValue={issueConfiguration.hourFormat}
                />
                <TextField
                    label="Date format"
                    name="dateFormat"
                    isRequired
                    type="text"
                    defaultValue={issueConfiguration.dateFormat}
                />
                <TextField
                    label="Sipgate Number"
                    name="sipgateNumber"
                    isRequired
                    type="text"
                    description={`Your sipgater number without the last digit.\n\n
                    Your phone number: +49 2111 234567 - 0\n
                    Please input: 492111234567
                    `}
                    defaultValue={issueConfiguration.sipgateNumber}
                />
                <Heading size="large">
                    {"None configuriable fields"}
                </Heading>
                <Text>
                    <Strong>{"{{$number}}: "}</Strong>
                    This variable will be replaced with the calling number.
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
                    <Strong>{"{{$rating}}: "}</Strong>
                    {"This variable will be replaced with the rating from tellows."}
                </Text>
                <Text>
                    <Strong>{"{{$city}}: "}</Strong>
                    {"This variable will be replaced with the city of the caller, provided by tellows."}
                </Text>
                <Text>
                    <Strong>{"{{$sipgateNumber}}: "}</Strong>
                    {"This variable will be replaced with the called number, but only the last digit, based on configuration."}
                </Text>
                <Heading size="large">
                    {"Configuriable fields"}
                </Heading>
                <TextArea
                    label="{{$spamRatingField}}"
                    name="spamRatingField"
                    placeholder={`(Rate: {{$rating}})`}
                    isRequired
                    description={`This field specifies the spam rating for the number.`}
                    defaultValue={issueConfiguration.spamRatingField}
                />
                <TextArea
                    label="{{$cityField}}"
                    name="cityField"
                    placeholder={`from {{$city}}`}
                    isRequired
                    description={`This field specifies the caller's city for the ticket.`}
                    defaultValue={issueConfiguration.cityField}
                />
                <TextArea
                    label="{{$timeField}}"
                    name="timeField"
                    placeholder={`{{$time}} CET`}
                    isRequired
                    description={`This field specifies what ending will come after the time.`}
                    defaultValue={issueConfiguration.timeField}
                />
                <Heading size="large">
                    {"Issue configuration"}
                </Heading>
                <TextArea
                    label="Summary"
                    name="summary"
                    placeholder={`Call from {{$callerName}} {{$number}} {{$spamRatingField}} on -{{$sipgateNumber}} {{$cityField}} - {{$date}} - {{$timeField}}`}
                    isRequired
                    description={`The issue summary.`}
                    defaultValue={issueConfiguration.summary}
                />
                <TextArea
                    label="Description"
                    name="description"
                    description={`The issue description.`}
                    defaultValue={issueConfiguration.description}
                />
            </Form>
        </Tab>
    )
}
