# Application Design File

## Application Changes

For Assignment 4b, the biggest design changes was reverting the design changes made within Assignment 3 and 4a.

Originally we had five concepts that combined into two due to sharing of state. After implementation I realized that this huge concept that composed many others was not a good idea. Therefore, with the help of Professor Jackson I was able to break the application into six new concepts: UserAuthentication, StoreCatalog, CookBook, MenuCollection, WeeklyCart, and PurchaseSystem.

These concepts broke apart the previous MenuManager concept into the more accurate parts that it was accomplishing: Store+Ingredients, Recipe, Menu, Cart, Purchasing. The actual conceptual designs of these components did not change from the MenuManager concept, except for breaking them up into several concepts. You can read the design of each individual component below:

[UserAuthentication](./UserAuthentication/UserAuthentication.md)\
[StoreCatalog](./StoreCatalog/StoreCatalog.md)\
[CookBook](./CookBook/CookBook.md)\
[MenuCollection](./MenuCollection/MenuCollection.md)\
[WeeklyCart](./WeeklyCart/WeeklyCart.md)\
[PurchaseSystem](./PurchaseSystem/PurchaseSystem.md)

## Interesting Moments

1. Combination of Menu Concepts

   - [@concepts.101bfbc2 (Original)](../../context/design/concepts/MenuManager/OriginalMenuConcepts.md/steps/_.101bfbc2.md)
   - [@concepts.d7ee6989 (Combined)](../../context/design/concepts/MenuManager/Menu.md/steps/_.d7ee6989.md)
   - After receiving feedback from Assignment 2 I realized that the modularity of my concepts was not good. Rather, I had four concepts that depended on each other and knowing each other's state. After realizing this I had to create a new concept that put everything together now under one MenuManager concept. You can see the before and after context files above.

2. Missing Queries

   - [@concepts.101bfbc2 (No Queries)](../../context/design/concepts/MenuManager/MenuManager.md/steps/_.6278d3a6.md)
   - [@concepts.d7ee6989 (W/ LLM Queries)](../../context/design/concepts/MenuManager/queries.md/steps/_.07bcf5a1.md)
   - [@concepts.d7ee6989 (W/ Query Names)](../../context/design/concepts/MenuManager/queries.md/steps/_.4cc835b0.md)
   - Once I updated my MenuManager concept I realized that I forgot to include queries within the concept. Instead of simply doing it myself, I tried having Context doing it! I found that the LLM worked fairly well, except that it kind of guessed what queries would be useful or not. It was able to interpret some basic queries like getRecipesInMenu or getMenusOwnedByUser, but suggested others that won't be needed for the application like getUnconfirmedItems.
   - I tried again but this time providing the names of the queries that I wanted, and the LLM did much better! Some thing had to be tweaked but it got most of the way there.

3. First Attempt with LLM Implementation

   - [@concepts.101bfbc2 (Prompt Step Overview)](../../context/design/concepts/UserAuthentication/implementation.md/20251015_070104.e24d9600.md)
   - [@concepts.d7ee6989 (Output)](../../context/src/concepts/UserAuthentication/UserAuthenticationConcept.ts/20251015_070418.9d834e09.md)
   - I just wanted to say, wow. With previous experience trying to create a project using something new, like MongoDB, what the LLM ouputted could've taken me hours. Creating the interface, definining input/output types, properly documenting functions, writing the functions, and more. As someone who has loved software their whole life getting to see this in action, for my OWN project, is just fascinating. Even if there are some things wrong with the code (I'll have to fully read through to make sure), getting 80%-90% the way there is still baffling.

4. Refactoring with new action

   - [@concepts.e08adf2d (OG Concept)](../../context/design/concepts/UserAuthentication/addPasswordChange.md/steps/_.e08adf2d.md)
   - [@concepts.a4bb4543 (New Concept)](../../context/design/concepts/UserAuthentication/addPasswordChange.md/steps/_.a4bb4543.md)
   - [@concepts.file.a012234c (OG Implementation)](../../context/design/concepts/UserAuthentication/addPasswordChange.md/steps/file.a012234c.md)
   - [@concepts.file.c965c01b (New Implementation)](../../context/design/concepts/UserAuthentication/addPasswordChange.md/steps/file.c965c01b.md)
   - During implementation of the UserAuthentication concept I realized that for lifecycle management purposes, it was probably important to include a change password action within the concept. With that, I took to Context to see how it would do in changing things across concepts and implementation. It did great! The one tricky thing I noticed is having to copy and paste the changes from the LLM into the respective files can be difficult, but still works as you can also copy and paste the whole thing.

5. State build up? No no!

   - [@concepts.ced89c65 (Before Concept)](../../context/design/concepts/MenuManager/MenuManager.md/steps/_.ced89c65.md)
   - [@concepts.9d1ac7d6 (Updated Operating Principle)](../../context/design/concepts/MenuManager/MenuManager.md/steps/_.9d1ac7d6.md)
   - When trying to create my operating principle test case, I realized that my operating principle already assumed a state existed and worked on top of that.
   - This isn't good as the principle should illustrate the entire process and also makes the test cases improper as there is some build up of the state before you are able to exist.

6. LLM's wont take my job!

   - [@concepets.f89d8600 (Bad Fix)](../../context/design/concepts/MenuManager/fixBug.md/steps/response.f89d8600.md)
   - [@concepets.c33a0bbe (Self solved, provide solution to LLM)](../../context/design/concepts/MenuManager/fixBug.md/steps/_.c33a0bbe.md)
   - [@concepets.7995675e (Good Fix)](../../context/design/concepts/MenuManager/fixBug.md/steps/response.7995675e.md)
   - I was attempting, for probably 3-4 promps to try and fix a bug, and the LLM wasn't able to fix it. I should've originally taken a glance at the bug myself, but I decided okay something is wrong and wanted to see if I could figure it out. Not even 3 minutes later I realized the issue was that the operating principle test had sub steps within steps -> making the sub steps fail.
   - Interesting moment to see that I was able to realize something that I felt was a very easy fix, but the LLM wasn't able to after several attempts. Gives me hope that I will still have a job in the future!


