# Assignment 4c: Writeup

## Document Structure

This writeup consists of three main documents:

1. **[Design.md](./Design.md)** - Summarizes how the final design differs from the initial concept design (Assignment 2) and the visual design (Assignment 4b)
2. **[Reflection.md](./Reflection.md)** - Reflects on the experience, including what was hard/easy, mistakes, skills acquired, and conclusions about LLMs in software development
3. **[ConsoleTrace.md](./ConsoleTrace.md)** - Contains runtime traces showing the system's behavior
3. **[Application Video](https://www.youtube.com/watch?v=gaUMkUblu3s)** - Running through sample use case of application

## Summary

### Design Evolution

- **Assignment 2**: Monolithic MenuManager concept with all functionality combined
- **Assignment 4b**: Refactored into six modular concepts (UserAuthentication, StoreCatalog, CookBook, MenuCollection, WeeklyCart, PurchaseSystem)
- **Final Implementation**: Concepts coordinate through synchronizations, with Requesting concept handling HTTP requests via passthrough routes and request/response patterns

### Key Insights

- Modular concepts improve testability and maintainability
- Synchronizations make cross-concept dependencies explicit
- Requesting pattern provides clean abstraction for HTTP handling and authorization

### Experience Highlights

- Successfully implemented complex system with multiple interacting concepts
- Learned to use Context tool for design documentation and LLM prompting
- Gained experience with Deno, TypeScript, and MongoDB
- Developed better understanding of modularity and separation of concerns
