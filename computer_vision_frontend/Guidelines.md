# Technical guideline.

## Common.
### Imports.
Imports in vue components are always at the top op the file and sorted alphabetically.
Imports are never done dynamically.
Do not check if a given file does not exist when importing. Assume it exists.

### Context and environment.
Do not check the JS execution environment (e.g. if window is defined) in the code. Assume it is always the same.
This is a browser js execution context.

### Code style.
Never use comments.
Don't check if imported functions or variables are defined before using them. Assume they are always defined in the module exporting them.

### Coding standards.
Make use of the single responsibility principe.

### Side effects.
Functions should be pure and should not have side effects. For example:
A store should never do async calls, it should only update, get or mutate internal state. 

## Implementation.

### Fetching data.
Dont use axios for getting data.
Data fetch calls should be done through useFetch from vueuse package and implemented in src/fetch directory.
Do not create a service in the services directory for getting data. Use the properties useFetch exposes after calling the hooks from the fetch directory.

### Stores.
Stores should always be implemented in src/stores directory.
Setting data into the store should always be done with a function defined in the store object.
Getting data from a store should be done with a function defined in the store object.
Never make abstractions for setting store data in the src/services directory.