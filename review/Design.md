# Design Document

## Overview

This document summarizes how the final design of the MenuManager-Backend system differs from the initial concept design (Assignment 2) and the visual design (Assignment 4b).

## Initial Design (Assignment 2)

### Monolithic MenuManager Concept

- **Single Concept Architecture**: The system was designed as one large `MenuManager` concept that handled all functionality
- **Tight Coupling**: All components (recipes, menus, items, carts, orders) were tightly coupled within a single concept
- **State Management**: All state was managed in one place, making it difficult to reason about individual components
- **Reference**: [MenuManager Concept](../context/design/concepts/MenuManager/MenuManager.md/steps/_.9d1ac7d6.md)

### Key Characteristics

- Combined functionality for:
  - Store catalog (items and purchase options)
  - Recipe management (cookbook)
  - Menu collection
  - Shopping cart
  - Purchase system
- Direct state access across all components
- Limited modularity and reusability

## Assignment 4b Design Changes

### Refactoring into Modular Concepts

- **Six Separate Concepts**: Broke down MenuManager into:
  1. `UserAuthentication` - User management and authentication
  2. `StoreCatalog` - Item catalog and purchase options
  3. `CookBook` - Recipe management
  4. `MenuCollection` - Menu composition and management
  5. `WeeklyCart` - Shopping cart functionality
  6. `PurchaseSystem` - Order and purchase management

### Design Rationale

- **Separation of Concerns**: Each concept has a single, well-defined purpose
- **Independence**: Concepts can be understood and tested independently
- **Explicit Relationships**: Concepts interact through synchronizations rather than direct state access

### No more LLM Augmentation

The final large change was dropping the LLM augmentation for the application. After disucissong with Professor Jackson it would require a lot of implementation and became very complex, but the LLM Augmentation for creating recipes didn't help the purpose of the application.

The original purpose of the application was to reduce the amount of time that the Food Stewards spent aggregating ingredients, and althought the augmentation would be beneficial, with how large the application already was I had to reduce the scope of the application.


## Final Implementation

### Concept Summaries

#### UserAuthentication

- Manages user accounts with username, password, and admin privileges
- First registered user automatically becomes admin; admins can grant privileges to others
- Provides authentication and user management actions (register, authenticate, deleteUser, grantAdmin)
- Reference: [UserAuthentication Concept](../design/concepts/UserAuthentication/UserAuthentication.md)

#### StoreCatalog

- Maintains catalog of purchasable items (ingredients) with multiple purchase options per item
- Each purchase option includes store, quantity, units, price, and confirmation status
- Supports item creation, purchase option management, and confirmation workflow
- Reference: [StoreCatalog Concept](../design/concepts/StoreCatalog/StoreCatalog.md)

#### CookBook

- Stores recipe definitions with ingredients (name, quantity, units), instructions, and ownership
- Recipes can be created, updated, duplicated, and ingredients can be added/removed/modified
- Each recipe has an owner (User) and supports recipe duplication for reuse
- Reference: [CookBook Concept](../design/concepts/CookBook/CookBook.md)

#### MenuCollection

- Organizes recipes into menus for specific dates with per-recipe scaling factors
- Menus have a name, date, owner, and map recipes to their scaling factors within the menu
- Supports menu creation, recipe addition/removal, and scaling factor adjustments
- Reference: [MenuCollection Concept](../design/concepts/MenuCollection/MenuCollection.md)

#### WeeklyCart

- Groups menus into weekly carts (Sunday to Saturday) for meal planning organization
- Carts are created from any date within a week and can have multiple menus added/removed
- Provides queries to find carts by date or by menu
- Reference: [WeeklyCart Concept](../design/concepts/WeeklyCart/WeeklyCart.md)

#### PurchaseSystem

- Manages hierarchical orders (AtomicOrder, SelectOrder, CompositeOrder) for cost optimization
- Automatically calculates optimal purchases across multiple stores and package sizes
- Supports nested composite orders (e.g., cart contains menus, menus contain recipes) with scaling factors
- Reference: [PurchaseSystem Concept](../design/concepts/PurchaseSystem/PurchaseSystem.md)

## Future!

Overall the application fulfills its intended purpose, supporting all the necessary functionality. Actions are authenticated and access is controlled appropriately using back-end synchronizations. Yet, the application is not perfect or robust. After spending close to 100 hours on this project I have brought it as close to perfect as I can, but here are a list of potential fixes/improvements I plan on making in the future:

- Copying recipes - If you see someone elses recipe that you like and what to modify your own, simply duplicate it and make your changes.
- Session concept - Currently not the most secure mechanism is in place, but it allows sessioning to be done.
- LLM Augmentation - It would be nice to bring back the augmentation.
- Menu Summary - Short menu summary at the top of menu pages.
- Instacart API - Unfortunately haven't been accepted as a developer for their program, but once I am I can use the Instacart API to automatically add ingredients to our cart for purchase.
