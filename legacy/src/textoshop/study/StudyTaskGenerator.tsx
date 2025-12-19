import { ModelState } from "../model/Model";


export type StudyStepType = "TASK" | "MESSAGE" | "VIDEO" | "FREEFORM_LAUNCHER";

export type StudyTask = "SHORTEN_SQUASH_ORPHANS" | "INTEGRATE_TEXT_FRAGMENTS" | "CHANGE_TONE_DIALOGUE" | "WRITE_EMAIL_USING_TEMPLATE" | "NOT_A_TASK" | "FREE_FORM";

export type StudyCondition = "TEXTOSHOP" | "BASELINE" | "NOT_A_CONDITION";

export interface StudyStep {
    type: StudyStepType;
    instructions?: string[];
    message?: string;
    startingState?: Partial<ModelState>;
    task: StudyTask;
    condition: StudyCondition;
    saveData?: boolean;
}




export class StudyTaskGenerator {

    static generateSteps(participantId: number): StudyStep[] {
        let steps : StudyStep[] = [];

        // First, add the opening message with the link to complete the demographic survey
        steps.push({
            condition: "NOT_A_CONDITION",
            task: "NOT_A_TASK",
            type: "MESSAGE",
            message: `Thank you for participating in this study. Please, first complete this survey questionnaire: <a href="">Demographic survey</a>. After completing the survey, return to this page to continue the study.`,
        });


        const latinSquare = [
            [['S1', 'I1', 'T2', 'E2'], ['I2', 'E1', 'S2', 'T1']],
            [["I2", "E2", "S2", "T2"], ["E1", "T1", "I1", "S1"]], 
            [['E1', 'T2', 'I1', 'S2'], ['T1', 'S1', 'E2', 'I2']],
            [['T1', 'S2', 'E2', 'I1'], ['S1', 'I2', 'T2', 'E1']],

            [['S2', 'I2', 'T1', 'E2'], ['E1', 'T2', 'I1', 'S1']],
            [['I1', 'E2', 'S1', 'T1'], ['T2', 'S2', 'E1', 'I2']],
            [['E2', 'T1', 'I2', 'S2'], ['S1', 'I1', 'T2', 'E1']],
            [['T1', 'S2', 'E1', 'I2'], ['I1', 'E2', 'S1', 'T2']],

            [['S2', 'I2', 'T2', 'E1'], ['T1', 'S1', 'E2', 'I1']],
            [['I2', 'E2', 'S2', 'T1'], ['S1', 'I1', 'T2', 'E1']],
            [['E1', 'T2', 'I2', 'S1'], ['I1', 'E2', 'S2', 'T1']],
            [['T1', 'S1', 'E2', 'I1'], ['E1', 'T2', 'I2', 'S2']],
        ];

        const order = latinSquare[participantId % latinSquare.length];


        for (let conditionIdx = 0; conditionIdx < order.length; ++conditionIdx) {
            const condition = (participantId % 2) !== conditionIdx ? "TEXTOSHOP" : "BASELINE";
            const tasks = order[conditionIdx];
      
            tasks.forEach((taskId, idx) => {
              const task = taskDictionary[taskId];
      
              const videoName : {[name: string]: string} = {
                "S": resizeVideo,
                "I": integrateVideo,
                "T": toneVideo,
                "E": layersVideo
              }


              steps.push({
                type: "VIDEO",
                task: "NOT_A_TASK",
                condition: condition,
                saveData: idx !== 0,
                message: condition === "TEXTOSHOP" ? videoName[taskId[0]] : baselineVideo,
              });

              steps.push({
                ...task,
                type: "TASK",
                condition: condition,
              })
            });
            

            const url = ``

    
            steps.push({
                type: "MESSAGE",
                task: "NOT_A_TASK",
                condition: condition,
                saveData: true,
                message: `End of this part. Feel free to take a break. Please answer this questionnaire: <a href='${url}' target="_blank">Questionnaire</a>.`        ,
          });
      
          }

          steps.push({
            type: "VIDEO",
            task: "NOT_A_TASK",
            condition: "TEXTOSHOP",
            message: freeformVideo,
          });

          steps.push({
            type: "FREEFORM_LAUNCHER",
            task: "NOT_A_TASK",
            condition: "TEXTOSHOP",
        });

        steps.push({
            type: "TASK",
            task: "FREE_FORM",
            condition: "TEXTOSHOP",
            instructions: ["You are free to use the tools to modify the text as you wish. Feel free to explore the different tools and functionalities. When you are done, click on the 'Next' button to complete the study."],
            startingState: {
                layers: [
                    {
                        id: "1", layer: {
                            name: "Layer 1", color: "white", isVisible: true, modifications: {},
                            state: [{
                                //@ts-ignore
                                type: "paragraph",
                                children: [{
                                    text: ``
                                }],
                            }]
                        }
                    }
                ]
            }
        });
      
          steps.push(
            {
                saveData: true,
                type: "MESSAGE",
                task: "NOT_A_TASK",
                condition: "TEXTOSHOP",
                message: "Done! Thank you for participating in this study."
            }
        )

        return steps;
    }
}


const taskDictionary: { [name: string]: StudyStep} = {
    /**
     * SHORTEN SQUASH ORPHANS
     * VARIATION 1
     */
    "S1": {
        task: "SHORTEN_SQUASH_ORPHANS",
        instructions: ["Resize these paragraphs as follows:\nParagraph 1 => Shorten to avoid the very short final line dangling at the end.\nParagraph 2 => Expand so that the last line fills the entire width.\nParagraph 3 => Expand the second sentence so that it covers two lines. The second line should fill 1/2 of the width of the page."],
        startingState: {
            layers: [
                {
                    id: "1", layer: {
                        name: "Layer 1", color: "white", isVisible: true, modifications: {},
                        state: [{
                            //@ts-ignore
                            type: "paragraph",
                            children: [{
                                text: `Alice, a young girl, sits bored by a riverbank and spots a White Rabbit with a pocket watch and waistcoat lamenting that he is late. Surprised, Alice follows him down a rabbit hole, which sends her into a lengthy plummet but to a safe landing. 

Inside a room with a table, she finds a key to a tiny door, beyond which is a garden. While pondering how to fit through the door, she discovers a bottle labelled "Drink me". Alice drinks some of the bottle's contents, and to her astonishment, she shrinks small enough to enter the door. However, she had left the key upon the table and cannot reach it. 
                                
Alice then discovers and eats a cake labelled "Eat me" causing her to grow in size. Unhappy, Alice bursts into tears. The passing White Rabbit flees in a panic, dropping a fan and two gloves.` }],
                        }]
                    }
                }
            ]
        }
    },

    /**
     * SHORTEN SQUASH ORPHANS
     * VARIATION 2
     */
    "S2": {
        task: "SHORTEN_SQUASH_ORPHANS",
        instructions: ["Resize these paragraphs as follows while preserving the meaning of the text:\nParagraph 1 => Shorten to avoid the very short final line dangling at the end.\nParagraph 2 => Expand so that the last line fills the entire width.\nParagraph 3 => Expand the first sentence so that it covers two lines and the second line filling 1/2 of the width of the page."],
        startingState: {
            layers: [
                {
                    id: "1", layer: {
                        name: "Layer 1", color: "white", isVisible: true, modifications: {},
                        state: [{
                            //@ts-ignore
                            type: "paragraph",
                            children: [{
                                text: `Orphan Tom Sawyer lives with his Aunt Polly and his half-brother Sid in the town of Saint Petersburg, Missouri, sometime in the 1840s. He frequently skips school to play or go swimming. When Polly catches him sneaking home late on a Friday evening, she makes him whitewash her fence the next day as punishment.

Tom persuades several neighbourhood children to trade him small trinkets and treasures for the "privilege" of doing his work, using reverse psychology to convince them of its enjoyable nature. Later, Tom trades the trinkets with students in his Sunday school class for tickets, given out for memorizing verses of Scripture. He collects enough tickets to earn a prized Bible from the teacher, despite being one of the worst students in the class and knowing almost nothing of Scripture.
                                
Tom falls in love with Becky Thatcher, a girl who is new in town. Tom wins the admiration of her father, the prominent Judge Thatcher, in the church by obtaining the Bible as a prize, but reveals his ignorance when he cannot answer basic questions about Scripture. Tom pursues Becky, eventually persuading her to get "engaged" by kissing her. Their romance soon collapses when she discovers that Tom was "engaged" to another schoolgirl, Amy Lawrence.` }],
                        }]
                    }
                }
            ]
        }
    },












    /**
     * INTEGRATE TEXT FRAGMENTS
     * VARIATION 1
     */
    "I1": {
        task: "INTEGRATE_TEXT_FRAGMENTS",
        instructions: [
            ["Separate the text fragments at the bottom into two groups: one for ideas related to Alice and another for ideas related to the Rabbit."],
            ["Integrate/merge all the text fragments related to Alice into the last sentence of the first paragraph."],
            ["Remove the ideas expressed by the text fragments related to the Rabbit from the second sentence of the second paragraph"]
        ],
        startingState: {
            layers: [
                {
                    id: "1", layer: {
                        name: "Layer 1", color: "white", isVisible: true, modifications: {},
                        state: [{
                            //@ts-ignore
                            type: "paragraph",
                            children: [{
                                text: `Alice sat in a sunny meadow filled with colourful flowers. The sky was blue, and the birds were singing happily. She was enjoying the fresh air and the warmth of the sun.

Suddenly, a white rabbit hopped by, looking very busy. The rabbit, with its big, curious eyes darting around nervously and its long, floppy ears twitching with urgency, clutched a shiny pocket watch tightly in its paws, clearly in a hurry, as if every second counted.

Alice decided to follow the rabbit, curious about where it was going. She stood up quickly and ran after it, her heart pounding with excitement. 

The rabbit led her to a hidden door in a big tree. With a smile, Alice opened the door and stepped into a magical world full of wonder.` },
                            {
                                text: "\n________________________________________\n",
                                //@ts-ignore
                                //horizontalLine: true
                            },
                            {
                                text: "\n- sun making Alice sweat\n- Pocket watch held by the rabbit\n- Alice getting thirsty\n- The rabbit had floppy ears\n- Rabbit is in a hurry\n- Alice enjoys warmth of the sun on her skin\n"
                            }],
                        }]
                    }
                }
            ]
        }
    },
    /**
     * INTEGRATE TEXT FRAGMENTS
     * VARIATION 1
     */
    "I2": {
        task: "INTEGRATE_TEXT_FRAGMENTS",
        instructions: [
            ["Separate the text fragments at the bottom into two groups: one for ideas related to Tom and another for ideas related to the treasure."],
            ["Integrate/merge all the text fragments related to Tom into the first sentence of the third paragraph."],
            ["Remove the ideas expressed by the text fragments related to the treasure from the first sentence of the last paragraph"]
        ],
        startingState: {
            layers: [
                {
                    id: "1", layer: {
                        name: "Layer 1", color: "white", isVisible: true, modifications: {},
                        state: [{
                            //@ts-ignore
                            type: "paragraph",
                            children: [{
                                text: `Tom and Huck sneaked down to the riverbank, the moonlight guiding their steps. They had a grand plan: to find buried treasure. Tom carried an old, rusty shovel, while Huck held a lantern that flickered in the night breeze.

They reached the big oak tree, the one Injun Joe always walked by. Tom pointed to a spot near the roots. "This is it, Huck! We'll be rich!" With a nod, Huck set the lantern down, and Tom started digging with all his might.

The ground was hard, but Tom didn't give up. Huck kept watch, his heart pounding with excitement. After a while, Tom's shovel hit something solid. They both leaned in, eyes wide. Tom scraped away the dirt to reveal a small, wooden box.

Inside, they eagerly expected to find glittering gold and precious jewels, but instead, to their utter surprise and disbelief, they uncovered only a handful of tarnished ancient coins, a dusty locket, and an old manuscript, far from the riches they had imagined. Tom grinned. “It's not treasure, but it's a start, Huck! We'll find more one day!” Huck smiled back, and they knew the adventure was just beginning.` },
                            {
                                text: "\n________________________________________\n",
                                //@ts-ignore
                                //horizontalLine: true
                            },
                            {
                                text: "\n- Cool breeze blowing on Tom's hair\n- Surprising treasure\n- Tom wearing worn-out overalls\n- Treasure includes a locket\n- Treasure is old\n- Tom fueled by curiosity\n"
                            }],
                        }]
                    }
                }
            ]
        }
    },






    /**
     * CHANGE TONE DIALOGUE
     * VARIATION 1
     */
    "T1": {
        task: "CHANGE_TONE_DIALOGUE",
        instructions: ["Change the tone of the dialogues so that Alice uses formal and negative language. The Rabbit's dialogues should remain unchanged.", "Now explore 4 variations of the Rabbit's last dialogue."],
        startingState: {
            layers: [
                {
                    id: "1", layer: {
                        name: "Layer 1", color: "white", isVisible: true, modifications: {},
                        state: [{
                            //@ts-ignore
                            type: "paragraph",
                            children: [{
                                text: `Alice: Hello there, Rabbit. I did not mean to startle you, but I heard you speaking to yourself just now. Can you tell me what you were talking about?

Rabbit: Oh, hello Alice. I was just thinking out loud about the time. It seems like I am always rushing somewhere. I believe I was reminding myself not to be late.

Alice: That is quite interesting, Rabbit. I often wonder why you are always in such a hurry. Is there something very important that you need to do, or somewhere you need to be?

Rabbit: Yes, Alice, I have a prior engagement I must attend. My schedule is quite packed and missing a single appointment can cause a lot of trouble for me. It is quite exhausting.

Alice: I see. It must be difficult to always be on the go and never have a moment to rest. Do you ever wish that you had more time to relax and enjoy yourself?

Rabbit: Sometimes I do think about that, Alice. However, it seems that my responsibilities simply will not allow it. There are always tasks that need to be completed and places to be.

Alice: I understand, Rabbit. It sounds like a very demanding life. I hope you do find some time for yourself eventually. It is important` }],
                        }]
                    }
                }
            ]
        }
    },
    /**
     * CHANGE TONE DIALOGUE
     * VARIATION 2
     */
    "T2": {
        task: "CHANGE_TONE_DIALOGUE",
        instructions: ["Change the tone of the dialogues so that Sherlock uses informal and positive language. Watson's dialogues should remain unchanged.", "Now explore 4 variations of Watson's last dialogue."],
        startingState: {
            layers: [
                {
                    id: "1", layer: {
                        name: "Layer 1", color: "white", isVisible: true, modifications: {},
                        state: [{
                            //@ts-ignore
                            type: "paragraph",
                            children: [{
                                text: `
Sherlock Holmes: Watson, do you notice anything unusual about this room?

Dr. Watson: I can't say that I do, Holmes. It looks like an ordinary sitting room to me.

Sherlock Holmes: Ah, but look closer. See the dust on that table? It's been disturbed only in one spot, where a book once lay. The rest of the table is untouched.

Dr. Watson: Now that you mention it, I do see it. But what does that tell us, Holmes?

Sherlock Holmes: It tells us that someone was in this room recently, and they left in a hurry. They took the book with them, but not before leaving behind a clue—a small piece of paper under the chair.

Dr. Watson: Incredible, Holmes! How do you always manage to see what others overlook?

Sherlock Holmes: It's elementary, my dear Watson. Observation is the key. We only see what we are prepared to look for.` }],
                        }]
                    }
                }
            ]
        }
    },






    /**
     * WRITE AN EMAIL USING A TEMPLATE
     * VARIATION 1
     */
    "E1": {
        task: "WRITE_EMAIL_USING_TEMPLATE",
        instructions: [
            "You are the Customer Service representative for an e-commerce company. Write an email to respond to John, a customer who has contacted you about their recent order. The customer's email is asking for a refund and is frustrated with the service. Compensate them with a 20$ voucher.",
            "Now write an email to respond to Mary, a customer who has contacted you with a general inquiry. The email of the customer is calm and polite. Compensate them with a 3-month subscription to Prime"
        ],
        startingState: {
            layers: [
                {
                    "id": "0",
                    "layer": {
                        "name": "Email",
                        "color": "white",
                        "isVisible": true,
                        "modifications": {},
                        "state": [
                            {
                                "type": "paragraph",
                                "children": [
                                    {
                                        "text": "Dear [Customer Name],\n\nThank you for reaching out to Amazen Customer Service. We appreciate your patience and are here to assist you with your inquiry. "
                                    },
                                    {
                                        "text": "\u0000",
                                        "layerTagId": 1
                                    },
                                    {
                                        "text": "\u0000",
                                        "layerTagId": 2
                                    },
                                    {
                                        "text": "\u0000",
                                        "layerTagId": 3
                                    },
                                    {
                                        "text": "\u0000",
                                        "layerTagId": 4
                                    },
                                    {
                                        "text": "\u0000",
                                        "layerTagId": 5
                                    },
                                    {
                                        "text": "\u0000",
                                        "layerTagId": 6
                                    },
                                    {
                                        "text": "\u0000",
                                        "layerTagId": 7
                                    },
                                    {
                                        "text": "\u0000",
                                        "layerTagId": 8
                                    },
                                    {
                                        "text": "\u0000",
                                        "layerTagId": 9
                                    },
                                    {
                                        "text": "\u0000",
                                        "layerTagId": 10
                                    },
                                    {
                                        "text": "\u0000",
                                        "layerTagId": 11
                                    },
                                    {
                                        "text": "\u0000",
                                        "layerTagId": 12
                                    },
                                    {
                                        "text": "\u0000",
                                        "layerTagId": 13
                                    },
                                    {
                                        "text": "\n\nThank you for your understanding and patience\n\nBest Regards,\nThe Amazen Customer Service"
                                    }
                                ]
                            }
                        ],
                        "layerIndex": 0
                    }
                },
                {
                    "id": "1",
                    "layer": {
                        "name": "Type of request",
                        "color": "#1f78b4",
                        "isVisible": true,
                        "modifications": {},
                    },
                    "children": [
                        {
                            "id": "2",
                            "layer": {
                                "name": "General Inquiry",
                                "color": "#1f78b4",
                                "isVisible": true,
                                "modifications": {
                                    "1": "I understand you have some questions regarding your recent interaction with us. ",
                                    "8": "\n\nWe are currently looking into your request and will provide an update shortly. "
                                },
                            },
                            "children": []
                        },
                        {
                            "id": "3",
                            "layer": {
                                "name": "Refund Request",
                                "color": "#1f78b4",
                                "isVisible": true,
                                "modifications": {
                                    "2": "I see that you have a question about your recent order. ",
                                    "9": "\n\nI have reviewed your order, and we will process a refund immediately. "

                                },
                            },
                            "children": []
                        },
                        {
                            "id": "4",
                            "layer": {
                                "name": "Account-Related",
                                "color": "#1f78b4",
                                "isVisible": true,
                                "modifications": {
                                    "3": "It appears you have an inquiry regarding your account. ",
                                    "10": "\n\nWe have updated your account details as requested. "
                                },
                            },
                            "children": []
                        }
                    ]
                },
                {
                    "id": "5",
                    "layer": {
                        "name": "Style",
                        "color": "#33a02c",
                        "isVisible": true,
                        "modifications": {},
                    },
                    "children": [
                        {
                            "id": "6",
                            "layer": {
                                "name": "If calm and polite",
                                "color": "#33a02c",
                                "isVisible": true,
                                "modifications": {
                                    '4': "We are happy to help you resolve this as quickly as possible. "
                                },
                            },
                            "children": []
                        },
                        {
                            "id": "7",
                            "layer": {
                                "name": "If frustrated or upset",
                                "color": "#33a02c",
                                "isVisible": true,
                                "modifications": {
                                     '5': "We understand your frustration and are working to address the issue as soon as possible. "
                                },
                            },
                            "children": []
                        },
                        {
                            "id": "8",
                            "layer": {
                                "name": "If in a rush",
                                "color": "#33a02c",
                                "isVisible": true,
                                "modifications": {
                                     '6': "We recognize the urgency of your request and will prioritize resolving this for you immediately. "
                                },
                            },
                            "children": []
                        }
                    ]
                },
                {
                    "id": "9",
                    "layer": {
                        "name": "Compensation",
                        "color": "#e31a1c",
                        "isVisible": true,
                        "modifications": {},
                    },
                    "children": [
                        {
                            "id": "10",
                            "layer": {
                                "name": "Voucher",
                                "color": "#e31a1c",
                                "isVisible": true,
                                "modifications": {
                                    '11': "As a token of our appreciation for your understanding, we would like to offer you a $[VALUE] Amazen gift voucher for your next purchase. "
                                },
                            },
                            "children": []
                        },
                        {
                            "id": "11",
                            "layer": {
                                "name": "Discount",
                                "color": "#e31a1c",
                                "isVisible": true,
                                "modifications": {
                                     '12': "To compensate for any inconvenience this may have caused, we are pleased to provide you with a [PERCENT]% discount on your next order with us. "
                                },
                            },
                            "children": []
                        },
                        {
                            "id": "12",
                            "layer": {
                                "name": "Subscription",
                                "color": "#e31a1c",
                                "isVisible": true,
                                "modifications": {
                                     '13': "We value your loyalty and would like to offer you a complimentary [NUMBER OF MONTHS]-month subscription to Amazen Prime as a gesture of goodwill. "
                                },
                            },
                            "children": []
                        }
                    ]
                }
            ] as any
        }
    },
    /**
     * WRITE AN EMAIL USING A TEMPLATE
     * VARIATION 2
     */
    "E2": {
        task: "WRITE_EMAIL_USING_TEMPLATE",
        instructions: [
            "You are a tech support representative for a software company. Write an email to respond to David, a customer who has contacted you about an update issue. Respond with an expected timeframe of 24 hours and using a formal closing style.",
            "Now write an email to respond to Lisa, a customer who has contacted you with a shiping issue. Respond with an expected timeframe of 3 business days and using a reassuring closing style."
        ],
        startingState: {
            layers: [
                {
                    "id": "0",
                    "layer": {
                        "name": "Email",
                        "color": "white",
                        "isVisible": true,
                        "modifications": {},
                        "state": [
                            {
                                "type": "paragraph",
                                "children": [
                                    {
                                        "text": "Dear [Customer Name],\n\nThank you for reaching out to us. We appreciate you bringing this to our attention and sincerely apologize for any inconvenience you may have experienced. We understand that "
                                    },
                                    {
                                        "text": "\u0000",
                                        "layerTagId": 1
                                    },
                                    {
                                        "text": "\u0000",
                                        "layerTagId": 2
                                    },
                                    {
                                        "text": "\u0000",
                                        "layerTagId": 3
                                    },
                                    {
                                        "text": "Our team is currently investigating the issue, and we assure you that we are doing everything we can to resolve it as quickly as possible.\n\nWe will ",
                                    },
                                    {
                                        "text": "\u0000",
                                        "layerTagId": 4
                                    },
                                    {
                                        "text": "\u0000",
                                        "layerTagId": 5
                                    },
                                    {
                                        "text": "\u0000",
                                        "layerTagId": 6
                                    },
                                    {
                                        "text": "You can expect an update ",
                                    },

                                    {
                                        "text": "\u0000",
                                        "layerTagId": 7
                                    },
                                    {
                                        "text": "\u0000",
                                        "layerTagId": 8
                                    },
                                    {
                                        "text": "\u0000",
                                        "layerTagId": 9
                                    },
                                    {
                                        "text": "\n\n",
                                    },
                                    {
                                        "text": "\u0000",
                                        "layerTagId": 10
                                    },
                                    {
                                        "text": "\u0000",
                                        "layerTagId": 11
                                    },
                                    {
                                        "text": "\u0000",
                                        "layerTagId": 12
                                    },
                                    {
                                        "text": "\n\nBest Regards,\nThe Tech Support"
                                    }
                                ]
                            }
                        ],
                        "layerIndex": 0
                    }
                },
                {
                    "id": "1",
                    "layer": {
                        "name": "Type of request",
                        "color": "#1f78b4",
                        "isVisible": true,
                        "modifications": {},
                    },
                    "children": [
                        {
                            "id": "2",
                            "layer": {
                                "name": "Update Issue",
                                "color": "#1f78b4",
                                "isVisible": true,
                                "modifications": {
                                    "1": "you've encountered difficulties with the latest software update, which caused unexpected disruptions in your workflow. ",
                                    "4": "coordinate with our technical team to expedite the resolution process and provide you with a swift update. "
                                },
                            },
                            "children": []
                        },
                        {
                            "id": "3",
                            "layer": {
                                "name": "Access Issue",
                                "color": "#1f78b4",
                                "isVisible": true,
                                "modifications": {
                                    "2": "the recent changes to your account settings have led to access issues, preventing you from using key features. ",
                                    "5": "implement a solution to prevent this issue from recurring in the future. "

                                },
                            },
                            "children": []
                        },
                        {
                            "id": "4",
                            "layer": {
                                "name": "Shiping Issue",
                                "color": "#1f78b4",
                                "isVisible": true,
                                "modifications": {
                                    "3": "you've experienced a delay in receiving your order, which has caused a disruption in your planned activities. ",
                                    "6": "work with our shipping partners to expedite the delivery and ensure your order reaches you as soon as possible. "
                                },
                            },
                            "children": []
                        }
                    ]
                },
                {
                    "id": "5",
                    "layer": {
                        "name": "Expected Timeframe",
                        "color": "#33a02c",
                        "isVisible": true,
                        "modifications": {},
                    },
                    "children": [
                        {
                            "id": "6",
                            "layer": {
                                "name": "Hours",
                                "color": "#33a02c",
                                "isVisible": true,
                                "modifications": {
                                    '7': "in about [HOURS] hours from now. "
                                },
                            },
                            "children": []
                        },
                        {
                            "id": "7",
                            "layer": {
                                "name": "Days",
                                "color": "#33a02c",
                                "isVisible": true,
                                "modifications": {
                                     '8': "in the next [DAYS] business days. "
                                },
                            },
                            "children": []
                        },
                        {
                            "id": "8",
                            "layer": {
                                "name": "Unknown",
                                "color": "#33a02c",
                                "isVisible": true,
                                "modifications": {
                                     '9': "as soon as we have more information, although this might take some time. "
                                },
                            },
                            "children": []
                        }
                    ]
                },
                {
                    "id": "9",
                    "layer": {
                        "name": "Closing Style",
                        "color": "#e31a1c",
                        "isVisible": true,
                        "modifications": {},
                    },
                    "children": [
                        {
                            "id": "10",
                            "layer": {
                                "name": "Formal",
                                "color": "#e31a1c",
                                "isVisible": true,
                                "modifications": {
                                    '10': "Thank you for your understanding and continued trust. "
                                },
                            },
                            "children": []
                        },
                        {
                            "id": "11",
                            "layer": {
                                "name": "Friendly",
                                "color": "#e31a1c",
                                "isVisible": true,
                                "modifications": {
                                     '11': "Thanks again for being such a valued customer! We're here for you if you need anything else. "
                                },
                            },
                            "children": []
                        },
                        {
                            "id": "12",
                            "layer": {
                                "name": "Reassuring",
                                "color": "#e31a1c",
                                "isVisible": true,
                                "modifications": {
                                     '12': "We're committed to making this right for you, and we appreciate your patience as we work through this. "
                                },
                            },
                            "children": []
                        }
                    ]
                }
            ] as any
        }
    }
} as any;