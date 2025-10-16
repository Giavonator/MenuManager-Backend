# MenuManager Design Changes

1. Condensed ItemStore, PlatMaison, MenuDuJour, and WeeklyShoppingCart into one MenuManager concept.

    - Realized that the concepts were not modular, as they all depended on each others states
    - Originally was thinking more object oriented, but really all of these ideas come together to form one concept
    - The largest of the changes to the concept

2. Moving forward with AI Augmentation from Assignment 3

    - Originally I wasn't going to move forward with the LLM augmentation, but after some consideration I deciding to change the concept design to include it. The biggest reason to doing so is that it is something I've never done before and would love to continue learning and using it.
    - An additional design change to aid in this transition was having each item have various names in the state, to help the LLM in finding and item ('pepper' could be 'ground pepper', 'pepper', 'black pepper', 'course pepper' its all just pepper).
