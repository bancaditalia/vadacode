# Datalog+/- and Vadalog code-generation guidelines

* Programs. A program is a set of rules and facts; order does not affect reasoning.
* Comments. Start a line with `%`, e.g., `% this is a comment`.
* Atom. An atom is a predicate applied to terms: `r(t1, …, tn)`. If it contains only constants it’s a fact.
* Fact. A fact is a ground atom terminated by a dot, e.g., `employee("Jack").` Facts have no body. Variables cannot occur in facts.
* Rule shape. Write rules as `Head :- BodyAtom1, …, BodyAtomN, Conditions, Assignments.` Use `:-` as the implication symbol and end the rule with a final `.`.
* Head and body. `Head` is one atom; the body is a comma‑separated conjunction of atoms (and optional conditions/assignments). Body variables are universally quantified; variables that appear in the head but not in the body are existentially quantified.
* Variables. Use capitalized identifiers (underscores allowed). Variables are local to a rule; the same name in different rules denotes different variables.
* Constants. Constants may appear in head or body. In the head they generate fixed values; in the body they act as filters.
* Conditions (filters). After the body atoms, add comparisons like `X>0`, `Y="Chelsea"`, `X<>Y+Z`. Comparison symbols are `>, <, =, >=, <=, <>, !=`; they filter bindings (they are not Boolean-returning operators like `==`). Multiple conditions are comma‑separated.
* Assignments (computed head values). After the body, use equations to compute values for head (existential) variables, e.g., `Z=X+Y, A=(X+Y)/2`. An assignment uses `=` but is distinguished because the left-hand side variable does not appear in the body.
* Expressions: The arithmetic operators `*`,`/`,`+`,`-` can be applied to all numeric (integer and double) operands, with an implicit upcast to double if any double is involved. The Boolean operators are `and` (corresponding to `&&`), `or` (corresponding to `||`), `not`.
* Aggregation operators evaluate a given function over a set of facts. They can be used in expressions that are the right-hand side of assignments; this means that, unlike single fact-operators, they cannot be used in conditions.
* Negation. Prefix an atom with `not`, e.g., `not contractor(P)`. Every variable that occurs in the head must have a binding in a non-negated atom. Every binding of a variable that occurs only in a negation is not exported outside of the negation.
* Negation as failure is a false symbol `#F` in the head that makes the reasoning process fail when conditions in the body are verified.
* Marked nulls. Existential variables (or nulls from sources) yield marked nulls like `z1`, `z2` in derived facts; their type is unknown.
* Annotations. Use `@annotationName(params)` to control I/O and behavior. Annotations are prefixed, whitespace‑separated (no commas between them). Forms:

  * Stand‑alone: `@output("p").` It's the most typical form annotation.
  * Rule‑level: `@annotation(...) Head :- Body.`
  * Fact‑level: `@annotation(...) fact(...).`
    
## Input-output

* `@input` declares which predicates to read from sources with `@input("PredicateName").`
* `@output` declares which predicates to emit with `@output("PredicateName").`
* `@bind` binds an input or output atom to a source. The syntax for `@bind` is: `@bind("atomName","data source","outermost container","innermost container").` where `atomName` is the atom we want to bind, `data source` is the name of a source (`csv`, `parquet`, `postgres`, `neo4j`), `outermost container` is a container in the data source (e.g., a schema for `postgres`, or a directory for `csv` and `parquet`), `innermost container` is a content in the data source (e.g. a table name for `postgres`, a file for `csv`, and a parquet directory for `parquet`).
* `@mapping` maps specific columns of the input/output source to a position of an atom: `@mapping("atomName",positionInAtom,"columnName","columnType").` where `atomName` is the atom we want to map, `positionInAtom` is an integer (from 0) denoting the position of the atom that we want to map; `columnName` is the name of the column in the source (or equivalent data structure), `columnType` is an indication of the type in the source. The following types can be specified: **string**, **int**, **double**, **boolean** and **date**.
* `@qbind` is an alternative to `@bind` that binds an input atom to a source, generating the facts for the atom as the result of a query executed on the source: `@qbind("atomName","data source","outermost container","query").` where `atomName` is the atom we want to bind, `data source` is the name of a source defined in the Vadalog configuration, `outermost container` is a container in the data source (e.g., a schema in a relational database), `query` is a query in the language supported by the source (e.g., SQL for relational databases). E.g. `@qbind("t","postgres","vada","select * from ""TestTable"" where id between 1 and 2").`

## Post-processing
* Post-processing annotations. Declare which predicates to post process with `@post("atomName","post processing directive").`. Supported directives are for example `unique`, `limit(N)`, `argmax(p, <p1,...,pn>)`.
* All indices in @post calls are 1-based, e.g. `@post("atomName", "argmax(4, <1,3>)").`.
* `@post("atomName", "argmax(p, <p1,...,pn>)")`: group facts of `atomName` by positions `p1,...,pn` and, within each group, keep only the facts whose value at position `p` (1-based) is maximal.
* `@post("atomName", "argmin(p, <p1,...,pn>)")`: group facts of `atomName` by positions `p1,...,pn` and, within each group, keep only the facts whose value at position `p` (1-based) is minimal.
* `@post("atomName", "certain")`: drop all facts of `atomName` that contain any marked nulls.
* `@post("atomName", "limit(N)")`: after all tuples are produced and all other post-processing is applied, trim `atomName` to the first `N` tuples (SQL-style LIMIT).
* `@post("atomName", "prelimit(N)")`: load at most `N` tuples into `atomName` **before** applying subsequent post-processing; this can terminate reasoning as soon as `N` tuples are loaded.
* `@post("atomName","max(p1,...,pn)")`: for each group formed by the **other** positions, keep the fact(s) whose projection on positions `p1,...,pn` is maximal (lexicographic comparison on the projected tuple).
* `@post("atomName","min(p1,...,pn)")`: for each group formed by the **other** positions, keep the fact(s) whose projection on positions `p1,...,pn` is minimal (lexicographic comparison on the projected tuple).
* `@post("atomName", "orderby(p1,...,pn)")`: sort `atomName` by the listed positions in order; prefix a position with `-` for descending order.
* `@post("atomName", "orderBy(1)")`: (as used in examples) sort `atomName` by position 1 ascending.
* `@post("atomName", "unique")`: remove duplicate facts from `atomName`.


## Equality-Generating Dependencies

* EGD syntax. Write an equality in the head and a normal body: `X=Y :- BodyAtoms, Conditions.` The equality atom (`X=Y`) is a *pseudo‑head*; finish with a final dot.&#x20;
* Variables to equate. `X` and `Y` must be variables that are bound via the body; the body provides the joins/filters that determine their values.&#x20;
* Placement with TGDs. Typical pattern: first derive labelled facts (often with marked nulls or Skolem terms), then use EGDs to unify labels, e.g. to glue edges in the same connected component.
* Runtime semantics.

  * null vs constant → replace the null with the constant;
  * null vs null → coalesce to the same marked null;
  * constant vs constant and they differ → unification failure; the engine stops with an error.&#x20;
* Multiple EGDs. You can declare several EGDs; each fires whenever its body matches, possibly propagating equalities discovered earlier.&#x20;
* Harmlessness requirement. VadaEngine accepts EGDs only when the set of EGDs is harmless: for every TGD, variables in *tainted* positions appear once in the body and no constants occur in tainted positions. The engine checks this before reasoning and throws an exception if violated.&#x20;
* Termination mode. With EGDs, t‑isomorphism termination is enabled automatically; t‑isomorphic facts may appear in the output.&#x20;
* Equality storage. Equalities learned at runtime are kept in an equality graph (default) or an equality hash table; choose hash table only when there are many small clusters.&#x20;
* Minimal example.

  ```datalogpm
  edge(1,2). edge(2,1). edge(1,3).
  conn(X,Y,Z) :- edge(X,Y).          % label each edge with a fresh Z
  Z1=Z2 :- conn(X,Y,Z1), conn(Y,Z,Z2).  % unify labels that touch
  @output("conn").
  ```

  This unifies all three edges into one component label.

## Aggregations

* **Supported aggregation functions**

  * *Monotonic*: `msum`, `mprod`, `munion`, `mmin`, `mmax`, `mcount`
  * *Non‑monotonic*: `min`, `max`, `count`
  * All aggregations operate on **float** values only

* **General syntax inside a rule**

  * `q(K1,…,Kn,J) :- body, J = aggr(X,<C1,…,Cm>).`

    * `K1,…,Kn` → optional **group‑by** keys (any head variables before `J`)
    * `body` → usual atom(s) and conditions
    * `aggr` → one of the supported functions
    * `X` → value being aggregated (constant, body variable, or single‑fact expression)
    * `<C1,…,Cm>` → optional **contributors** (ignored for `mmin`, `mmax`, `munion`)

* **Semantics**

  * For each distinct key tuple `(K1,…,Kn)` the engine maintains a *running aggregate* updated on every rule activation
  * **Monotonic operators** accept new facts without retracting old ones, enabling safe use in **recursive rules**

    * `msum` → running sum, contributors prevent double‑counting per `<C1,…,Cm>`
    * `mprod` → running product, decreasing as more factors ≤ 1 arrive
    * `munion` → set union of progressively larger sets
    * `mmin`/`mmax` → current minimum/maximum value seen
    * `mcount` → running count, optionally distinct per contributors
  * **Non‑monotonic operators** (`min`, `max`, `count`) work like SQL aggregates but **cannot** appear positively in recursion

* **Contributor handling**

  * Aggregator memorises the best (min/max) or last value per contributor vector
  * When contributors are present, only the *first* (better) value per `(C1,…,Cm)` affects the result

* **Homogeneity requirement**

  * If a predicate position is produced with an aggregate, every other rule head producing the same position must

    * use **existential variable** for that position
    * apply **the *same* aggregation function**

## Skolem functions
* Creates a *marked null* (existential id) that you can bind to a variable in a rule head or body.
* Deterministic per program: the same Skolem function name with the same arguments always yields the *same* null during one execution. Reuse the same call in multiple rules to make tuples share the identical marked null and thus join naturally.
* Range‑disjoint across names: two different Skolem function symbols (e.g. `#f`, `#g`) *never* generate the same null, even on identical inputs; switch to a different Skolem name (`#g…`, `#f1…`, `#f2…`) whenever you need a *new* existential independent from earlier ones.
* Skolem calls are allowed in **assignments** (`Z = #f(X,Y)`) inside the rule body and directly in **head terms** (`a(X,Y,#f(X,Y))`).

* **Usage tips for ChatGPT code generation**

  * Place the assignment `J = aggr(...)` **inside** the rule body, after normal atoms/conditions.
  * Remember to declare `@output("predicate")` for result predicates.
  * Use monotonic versions when writing **recursive** or **incremental** computations; prefer non‑monotonic for one‑shot, stratified queries.
