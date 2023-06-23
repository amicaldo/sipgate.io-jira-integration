import { storage } from "@forge/api"
import ForgeUI, { useEffect, useState, Code, Form, Heading, SectionMessage, Strong, Tab, Text, TextArea } from "@forge/ui"

export default function CallLogConfiguration() {
    const [callLogConfiguration, setCallLogConfiguration] = useState({})
    const [debug, setDebug] = useState({})
    const submitForm = async formData => {
        setCallLogConfiguration({
            ...callLogConfiguration,
            ...formData
        })

        setDebug({
            callLogConfiguration,
            formData
        })

        await storage.set("callLogConfiguration", {
            ...callLogConfiguration,
            ...formData
        })
    }

    useEffect(async () => {
        const callLogConfigurationRaw = await storage.get("callLogConfiguration")

        setCallLogConfiguration({
            incommingCall: callLogConfigurationRaw?.incommingCall ? callLogConfigurationRaw.incommingCall : "{{$timeField}}: Eingehender Anruf auf - {{$sipgateNumber}}",
            redirectedCall: callLogConfigurationRaw?.redirectedCall ? callLogConfigurationRaw.redirectedCall : "{{$timeField}}: Anruf weitergeleitet zu {{$sipgateUsername}}",
            answerCall: callLogConfigurationRaw?.answerCall ? callLogConfigurationRaw.answerCall : "{{$timeField}}: Anruf angenommen von {{$sipgateUsername}}",
            normalClearing: callLogConfigurationRaw?.normalClearing ? callLogConfigurationRaw.normalClearing : "{{$timeField}}: Anruf aufgelegt.",
            busy: callLogConfigurationRaw?.busy ? callLogConfigurationRaw.busy : "{{$timeField}}: Der Anruf wurde beendet da die angerufene Person beschäftigt war.",
            cancel: callLogConfigurationRaw?.cancel ? callLogConfigurationRaw.cancel : "{{$timeField}}: Der Anruf wurde beendet bevor eine Person ran gehen konnte.",
            noAnswer: callLogConfigurationRaw?.noAnswer ? callLogConfigurationRaw.noAnswer : "{{$timeField}}: Der Anruf wurde beendet da die angerufene Person diesen abgelehnt hat.",
            congestion: callLogConfigurationRaw?.congestion ? callLogConfigurationRaw.congestion : "{{$timeField}}: Der Anruf wurde beendet da die angerufene Person nicht erreichbar war.",
            notFound: callLogConfigurationRaw?.notFound ? callLogConfigurationRaw.notFound : "{{$timeField}}: Der Anruf wurde beendet da entweder die angerufene Telefonnummer nicht existiert oder diese Person nicht online ist.",
            callDuration: callLogConfigurationRaw?.callDuration ? callLogConfigurationRaw.callDuration : "Anrufdauer: {{$minutes}}:{{$seconds}} Minuten."
        })

        setDebug({
            callLogConfigurationRaw,
            callLogConfiguration
        })
    }, [])

    return (
        <Tab label="Call Log Configuration">
            <SectionMessage title="About">
                <Text>This Tab allows you to configure the call log.</Text>
                <Text>
                    The call log, logs every action done in a call stack.
                </Text>
                <Text>
                    For example:
                </Text>
                <Text>
                    {"{{$timeField}}: Call from X."}
                </Text>
                <Text>
                    {"{{$timeField}}: Call answered by X."}
                </Text>
            </SectionMessage>
            <Heading>
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
                <Strong>{"{{$timeField}}: "}</Strong>
                {"This variable will be replaced with the timeField configuration."}
            </Text>
            <Text>
                <Strong>{"{{$minutes}}: "}</Strong>
                {"This variable will be replaced with the minutes since the call came in."}
            </Text>
            <Text>
                <Strong>{"{{$seconds}}: "}</Strong>
                {"This variable will be replaced with the seconds since the call came in."}
            </Text>
            <Text>
                <Strong>{"{{$sipgateNumber}}: "}</Strong>
                {"This variable will be replaced with the called number, but only the last digit, based on configuration."}
            </Text>
            <Text>
                <Strong>{"{{$sipgateUsername}}: "}</Strong>
                {"This variable will be replaced with the sipgate username of the person answering, based on configuration."}
            </Text>
            <Text>
                <Strong>{"{{$sipgateUserID}}: "}</Strong>
                {"This variable will be replaced with the sipgate user id of the person answering, based on configuration."}
            </Text>
            <Heading size="large">
                {"Configuriable fields"}
            </Heading>
            <Form onSubmit={submitForm}>
                <TextArea
                    label="Incomming Call"
                    name="incommingCall"
                    isRequired
                    description="This field specifies the incomming call log entry."
                    defaultValue={callLogConfiguration.incommingCall}
                />
                <TextArea
                    label="Redirected Call"
                    name="redirectedCall"
                    isRequired
                    description="This field specifies the redirected call log entry."
                    defaultValue={callLogConfiguration.redirectedCall}
                />
                <TextArea
                    label="Call answered"
                    name="answerCall"
                    isRequired
                    description="This field specifies the answer call log entry."
                    defaultValue={callLogConfiguration.answerCall}
                />
                <TextArea
                    label="Call ended"
                    name="normalClearing"
                    isRequired
                    description="This field specifies the call ended log entry."
                    defaultValue={callLogConfiguration.normalClearing}
                />
                <TextArea
                    label="Call occupied"
                    name="busy"
                    isRequired
                    description="This field specifies the occupied log entry."
                    defaultValue={callLogConfiguration.busy}
                />
                <TextArea
                    label="Call hung up"
                    name="cancel"
                    isRequired
                    description="This field specifies the hung up log entry."
                    defaultValue={callLogConfiguration.cancel}
                />
                <TextArea
                    label="Call rejected"
                    name="noAnswer"
                    isRequired
                    description="This field specifies the rejected call log entry."
                    defaultValue={callLogConfiguration.noAnswer}
                />
                <TextArea
                    label="Could not reach"
                    name="congestion"
                    isRequired
                    description="This field specifies the could not reach call log entry."
                    defaultValue={callLogConfiguration.congestion}
                />
                <TextArea
                    label="Could not found"
                    name="notFound"
                    isRequired
                    description="This field specifies the could not be found call log entry."
                    defaultValue={callLogConfiguration.notFound}
                />
                <TextArea
                    label="Call duration"
                    name="callDuration"
                    isRequired
                    description="This field specifies the call duration log entry."
                    defaultValue={callLogConfiguration.callDuration}
                />
            </Form>
            <Code text={JSON.stringify(debug, null, 4)} language="json" />
        </Tab>
    )
}