import { storage } from "@forge/api"
import ForgeUI, { useEffect, useState, Form, Heading, Link, SectionMessage, Strong, Tab, Text, TextArea, TextField } from "@forge/ui"

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
            spamRatingField: issueConfigurationRaw?.spamRatingField ? issueConfigurationRaw.spamRatingField : " (Rate: {{$rating}})",
            cityField: issueConfigurationRaw?.cityField ? issueConfigurationRaw.cityField : " aus {{$city}}",
            timeField: issueConfigurationRaw?.timeField ? issueConfigurationRaw.timeField : "{{$time}} Uhr",
            summary: issueConfigurationRaw?.summary ? issueConfigurationRaw.summary : "Anruf von {{$number}}{{$spamRatingField}}{{$cityField}} - {{$date}} - {{$timeField}}",
            description: issueConfigurationRaw?.description ? issueConfigurationRaw.description : ""
        })
    }, [])

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
            <Text>
                We use <Link href="https://day.js.org/docs/en/display/format" openNewTab={true}>DayJS</Link> for formatting the time and date.
            </Text>
            <Form onSubmit={submitForm}>
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
                    description={`Your sipgater number without the last digit.\nExample: "492111234567" where the last digit "7" is representing the sipgate line, that was called.`}
                    defaultValue={issueConfiguration.sipgateNumber}
                />
                <Heading size="large">
                    {"None configuriable fields"}
                </Heading>
                <Text>
                    <Strong>{"{{$number}}: "}</Strong>
                    This variable will be replaced with the calling number. The number will be formated in the <Strong>ISO-3224</Strong> format.
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
                    isRequired
                    description={`This field specifies the spam rating for the number.`}
                    defaultValue={issueConfiguration.spamRatingField}
                />
                <TextArea
                    label="{{$cityField}}"
                    name="cityField"
                    isRequired
                    description={`This field specifies the caller's city for the ticket.`}
                    defaultValue={issueConfiguration.cityField}
                />
                <TextArea
                    label="{{$timeField}}"
                    name="timeField"
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