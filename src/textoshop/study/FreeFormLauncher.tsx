import { Button, Card, CardBody } from "@nextui-org/react";
import { useStudyStore } from "./StudyModel";

export default function FreeFormLauncher(props: {  }) {
  const nextStep = useStudyStore(state => state.nextStep);

  return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'rgb(242, 238, 240)' }}>
  <Card style={{ width: 500, padding: 10 }}>
    <CardBody>
     <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
     <div dangerouslySetInnerHTML={{__html: "Choose the text you will work with."}} />

        <Button color={"primary"} style={{ marginTop: 20, width: 300}} onClick={(e) => {
          useStudyStore.getState().setFreeformText("\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n");
          useStudyStore.getState().logEvent("NEXT_PRESSED");
          nextStep();
        }}>I will use my own text</Button>

        <Button  style={{ marginTop: 20, width: 300}} onClick={(e) => {
          useStudyStore.getState().setFreeformText(`Artificial intelligence (AI), in its broadest sense, is intelligence exhibited by machines, particularly computer systems. It is a field of research in computer science that develops and studies methods and software that enable machines to perceive their environment and use learning and intelligence to take actions that maximize their chances of achieving defined goals. Such machines may be called AIs.

Some high-profile applications of AI include advanced web search engines (e.g., Google Search); recommendation systems (used by YouTube, Amazon, and Netflix); interacting via human speech (e.g., Google Assistant, Siri, and Alexa); autonomous vehicles (e.g., Waymo); generative and creative tools (e.g., ChatGPT, Apple Intelligence, and AI art); and superhuman play and analysis in strategy games (e.g., chess and Go). However, many AI applications are not perceived as AI: "A lot of cutting edge AI has filtered into general applications, often without being called AI because once something becomes useful enough and common enough it's not labeled AI anymore.” 

Alan Turing was the first person to conduct substantial research in the field that he called "machine intelligence". Artificial intelligence was founded as an academic discipline in 1956, by those now considered the founding fathers of AI: John McCarthy, Marvin Minksy, Nathaniel Rochester, and Claude Shannon. The field went through multiple cycles of optimism, followed by periods of disappointment and loss of funding, known as AI winter. Funding and interest vastly increased after 2012 when deep learning surpassed all previous AI techniques, and after 2017 with the transformer architecture. This led to the AI boom of the early 2020s, with companies, universities, and laboratories overwhelmingly based in the United States pioneering significant advances in artificial intelligence. 

The growing use of artificial intelligence in the 21st century is influencing a societal and economic shift towards increased automation, data-driven decision-making, and the integration of AI systems into various economic sectors and areas of life, impacting job markets, healthcare, government, industry, education, propaganda, and disinformation. This raises questions about the long-term effects, ethical implications, and risks of AI, prompting discussions about regulatory policies to ensure the safety and benefits of the technology.

The various subfields of AI research are centered around particular goals and the use of particular tools. The traditional goals of AI research include reasoning, knowledge representation, planning, learning, natural language processing, perception, and support for robotics. General intelligence—the ability to complete any task performable by a human on an at least equal level—is among the field's long-term goals. 

To reach these goals, AI researchers have adapted and integrated a wide range of techniques, including search and mathematical optimization, formal logic, artificial neural networks, and methods based on statistics, operations research, and economics. AI also draws upon psychology, linguistics, philosophy, neuroscience, and other fields.`);
          useStudyStore.getState().logEvent("NEXT_PRESSED");
          nextStep();
        }}>Wikipedia "Artificial Intelligence"</Button>
      <Button style={{ marginTop: 20, width: 300}} onClick={(e) => {
          useStudyStore.getState().setFreeformText(`Maria Salomea Skłodowska-Curie (born 7 November 1867 - 4 July 1934), known simply as Marie Curie, was a Polish and naturalised-French physicist and chemist who conducted pioneering research on radioactivity. She was the first woman to win a Nobel Prize, the first person to win a Nobel Prize twice, and the only person to win a Nobel Prize in two scientific fields. Her husband, Pierre Curie, was a co-winner of her first Nobel Prize, making them the first married couple to win the Nobel Prize and launching the Curie family legacy of five Nobel Prizes. She was, in 1906, the first woman to become a professor at the University of Paris.

She was born in Warsaw, in what was then the Kingdom of Poland, part of the Russian Empire. She studied at Warsaw's clandestine Flying University and began her practical scientific training in Warsaw. In 1891, aged 24, she followed her elder sister Bronisława to study in Paris, where she earned her higher degrees and conducted her subsequent scientific work. In 1895, she married the French physicist Pierre Curie, and she shared the 1903 Nobel Prize in Physics with him and with the physicist Henri Becquerel for their pioneering work developing the theory of "radioactivity"—a term she coined. In 1906, Pierre Curie died in a Paris street accident. Marie won the 1911 Nobel Prize in Chemistry for her discovery of the elements polonium and radium, using techniques she invented for isolating radioactive isotopes. Under her direction, the world's first studies were conducted into the treatment of neoplasms by the use of radioactive isotopes. She founded the Curie Institute in Paris in 1920, and the Curie Institute in Warsaw in 1932; both remain major medical research centres. During World War I, she developed mobile radiography units to provide X-ray services to field hospitals.

While a French citizen, Marie Skłodowska Curie, who used both surnames, never lost her sense of Polish identity. She taught her daughters the Polish language and took them on visits to Poland. She named the first chemical element she discovered polonium, after her native country. Marie Curie died in 1934, aged 66, at the Sancellemoz sanatorium in Passy (Haute-Savoie), France, of aplastic anemia likely from exposure to radiation in the course of her scientific research and in the course of her radiological work at field hospitals during World War I. In addition to her Nobel Prizes, she received numerous other honours and tributes; in 1995 she became the first woman to be entombed on her own merits in the Paris Panthéon, and Poland declared 2011 the Year of Marie Curie during the International Year of Chemistry. She is the subject of numerous biographical works.`);
          useStudyStore.getState().logEvent("NEXT_PRESSED");
          nextStep();
        }}>Wikipedia "Marie Curie"</Button>


<Button style={{ marginTop: 20, width: 300}} onClick={(e) => {
          useStudyStore.getState().setFreeformText(`Alice was beginning to get very tired of sitting by her sister on the bank, and of having nothing to do: once or twice she had peeped into the book her sister was reading, but it had no pictures or conversations in it, “and what is the use of a book,” thought Alice “without pictures or conversations?”

So she was considering in her own mind (as well as she could, for the hot day made her feel very sleepy and stupid), whether the pleasure of making a daisy-chain would be worth the trouble of getting up and picking the daisies, when suddenly a White Rabbit with pink eyes ran close by her.

There was nothing so very remarkable in that; nor did Alice think it so very much out of the way to hear the Rabbit say to itself, “Oh dear! Oh dear! I shall be late!” (when she thought it over afterwards, it occurred to her that she ought to have wondered at this, but at the time it all seemed quite natural); but when the Rabbit actually took a watch out of its waistcoat-pocket, and looked at it, and then hurried on, Alice started to her feet, for it flashed across her mind that she had never before seen a rabbit with either a waistcoat-pocket, or a watch to take out of it, and burning with curiosity, she ran across the field after it, and fortunately was just in time to see it pop down a large rabbit-hole under the hedge.

In another moment down went Alice after it, never once considering how in the world she was to get out again.

The rabbit-hole went straight on like a tunnel for some way, and then dipped suddenly down, so suddenly that Alice had not a moment to think about stopping herself before she found herself falling down a very deep well.

Either the well was very deep, or she fell very slowly, for she had plenty of time as she went down to look about her and to wonder what was going to happen next. First, she tried to look down and make out what she was coming to, but it was too dark to see anything; then she looked at the sides of the well, and noticed that they were filled with cupboards and book-shelves; here and there she saw maps and pictures hung upon pegs. She took down a jar from one of the shelves as she passed; it was labelled “ORANGE MARMALADE”, but to her great disappointment it was empty: she did not like to drop the jar for fear of killing somebody underneath, so managed to put it into one of the cupboards as she fell past it.`);
          useStudyStore.getState().logEvent("NEXT_PRESSED");
          nextStep();
        }}>Alice's Adventures in Wonderland</Button>

</div>
    </CardBody>
  </Card>
</div>
}
