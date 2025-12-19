import { Button, Card, CardBody } from "@nextui-org/react";
import { useStudyStore } from "./StudyModel";

export default function StudyMessage(props: { content: string, showNextButton?: boolean }) {
  const nextStep = useStudyStore(state => state.nextStep);

  return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'rgb(242, 238, 240)' }}>
  <Card style={{ width: 500, padding: 10 }}>
    <CardBody>
      <div dangerouslySetInnerHTML={{__html: props.content}} />
     { props.showNextButton && <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'right' }}>
        <Button style={{ marginTop: 20, width: 100 }} onClick={(e) => {
          useStudyStore.getState().logEvent("NEXT_PRESSED");
          nextStep();
        }}>Next</Button>
      </div> }
    </CardBody>
  </Card>
</div>
}
