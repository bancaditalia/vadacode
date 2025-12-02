---
mode: edit
description: "Generate Vadalog/Datalog+/- code documentation using vadoc comments."
---

Add inline documentation for the head atom of a Vadalog/Datalog+/- rule.

* When adding documentation to Vadalog/Datalog+/- code, always use vadoc comments.
* Atoms can be documented using vadoc comments, which are like javadoc comments with a `@term` tag that documents each position in the atom.
* The documentation can be everywhere but is normally written when the atom is first used in the head of a rule.
* Vadoc comments ALWAYS start with `%%`.
* Use the following syntax for vadoc comments:

```datalogpm
%% Indirect ownership.
%%
%% @term {string} owner Id of owner entity.
%% @term {string} owned Id of owned entity.
%% @term {number} percentage Percentage of owned shares.
iowns(X, Y, Q) :- owns(X, Y, Q1), owns(Y, Z, Q2), Q=Q1*Q2.
```