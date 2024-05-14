import { storage } from "@forge/api"
import ForgeUI, { useEffect, useState, Form, Heading, SectionMessage, Strong, Tab, Text, TextArea } from "@forge/ui"

export default function CallLogConfiguration() {
    const [callLogConfiguration, setCallLogConfiguration] = useState({})
    const submitForm = async formData => {
        setCallLogConfiguration({
            ...callLogConfiguration,
            ...formData
        })

        await storage.set("callLogConfiguration", {
            ...callLogConfiguration,
            ...formData
        })
    }

    useEffect(async () => {
        const callLogConfigurationRaw = await storage.get("callLogConfiguration")

        setCallLogConfiguration({
            incommingCall: callLogConfigurationRaw?.incommingCall ? callLogConfigurationRaw.incommingCall : "{{$timeField}}: Incoming call on - {{$sipgateNumber}}",
            redirectedCall: callLogConfigurationRaw?.redirectedCall ? callLogConfigurationRaw.redirectedCall : "{{$timeField}}: Call redirected to {{$sipgateUsername}}",
            answerCall: callLogConfigurationRaw?.answerCall ? callLogConfigurationRaw.answerCall : "{{$timeField}}: Call accepted from {{$sipgateUsername}}",
            normalClearing: callLogConfigurationRaw?.normalClearing ? callLogConfigurationRaw.normalClearing : "{{$timeField}}: Hang up call.",
            busy: callLogConfigurationRaw?.busy ? callLogConfigurationRaw.busy : "{{$timeField}}: The call was terminated because the person called was busy.",
            cancel: callLogConfigurationRaw?.cancel ? callLogConfigurationRaw.cancel : "{{$timeField}}: The call was terminated before a person could answer.",
            noAnswer: callLogConfigurationRaw?.noAnswer ? callLogConfigurationRaw.noAnswer : "{{$timeField}}: The call was terminated because the person called rejected it.",
            congestion: callLogConfigurationRaw?.congestion ? callLogConfigurationRaw.congestion : "{{$timeField}}: The call was terminated because the person called could not be reached.",
            notFound: callLogConfigurationRaw?.notFound ? callLogConfigurationRaw.notFound : "{{$timeField}}: The call was terminated because either the called phone number does not exist or the person is not online.",
            callDuration: callLogConfigurationRaw?.callDuration ? callLogConfigurationRaw.callDuration : "Call duration: {{$minutes}}:{{$seconds}} minutes."
        })
    }, [])

    return (
        <Tab label="Call Log Configuration">
            <SectionMessage title="About">
                <Text>This tab enables you to configure the call log that gets written into the issue description..</Text>
                <Text>
                    The call log records every action performed in a call stack.
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
                    placeholder="{{$timeField}}: Incomming call on - {{$sipgateNumber}}"
                    isRequired
                    description="This field specifies the incomming call log entry."
                    defaultValue={callLogConfiguration.incommingCall}
                />
                <TextArea
                    label="Redirected Call"
                    name="redirectedCall"
                    placeholder="{{$timeField}}: Call redirected to {{$sipgateUsername}}"
                    isRequired
                    description="This field specifies the redirected call log entry."
                    defaultValue={callLogConfiguration.redirectedCall}
                />
                <TextArea
                    label="Call answered"
                    name="answerCall"
                    placeholder="{{$timeField}}: Call answered by {{$sipgateUsername}}"
                    isRequired
                    description="This field specifies the answer call log entry."
                    defaultValue={callLogConfiguration.answerCall}
                />
                <TextArea
                    label="Call ended"
                    name="normalClearing"
                    placeholder="{{$timeField}}: Call hangup."
                    isRequired
                    description="This field specifies the call ended log entry."
                    defaultValue={callLogConfiguration.normalClearing}
                />
                <TextArea
                    label="Call occupied"
                    name="busy"
                    placeholder="{{$timeField}}: The call was terminated because the called party was busy."
                    isRequired
                    description="This field specifies the occupied log entry."
                    defaultValue={callLogConfiguration.busy}
                />
                <TextArea
                    label="Call hung up"
                    name="cancel"
                    placeholder="{{$timeField}}: The call ended before anyone could pick up."
                    isRequired
                    description="This field specifies the hung up log entry."
                    defaultValue={callLogConfiguration.cancel}
                />
                <TextArea
                    label="Call rejected"
                    name="noAnswer"
                    placeholder="{{$timeField}}: The call ended because the called party declined it."
                    isRequired
                    description="This field specifies the rejected call log entry."
                    defaultValue={callLogConfiguration.noAnswer}
                />
                <TextArea
                    label="Could not reach"
                    name="congestion"
                    placeholder="{{$timeField}}: The call ended because the called party was unreachable."
                    isRequired
                    description="This field specifies the could not reach call log entry."
                    defaultValue={callLogConfiguration.congestion}
                />
                <TextArea
                    label="Could not found"
                    name="notFound"
                    placeholder="{{$timeField}}: The call ended because either the called phone number does not exist or the person is not online."
                    isRequired
                    description="This field specifies the could not be found call log entry."
                    defaultValue={callLogConfiguration.notFound}
                />
                <TextArea
                    label="Call duration"
                    name="callDuration"
                    placeholder="Call duration: {{$minutes}}:{{$seconds}} minutes."
                    isRequired
                    description="This field specifies the call duration log entry."
                    defaultValue={callLogConfiguration.callDuration}
                />
            </Form>
        </Tab>
    )
}
