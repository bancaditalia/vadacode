# Vadalog Handbook

_Manual for Vadalog 1.19.12_

## Rules

A rule is an expression of the form `h(X, Y, E) :- b1(X, Y), b2(Y, Z), ...` where :- is the implication sign (right to left), `b1`, `b2` and so on are the atoms of the **body** and `h` is the atom of the **head**.

The variables in the body are universally quantified (in the example, X, Y and Z), while the variables that appear in the head, but not in the body are existentially quantified (E, in the example).

HINT: If you are asked to say universal variables of the rule, identify variables to the right of :-, e.g. `h(X, Y, E) :- b1(X, Y), b2(Y, Z), ...` => X, Y, Z.
HINT: If you are asked to say existential variables of the rule, identify variables to the left of :- and not to the right, e.g. `h(X, Y, E) :- b1(X, Y), b2(Y, Z), ...` => E.


Example 1

```datalogpm
a(X) :- b(X).
```

It generates facts for atom `a`, given facts for atom `b`. `X` is a variable.

Example 2

```datalogpm
a(X,Z) :- b(X,Y),c(Y,Z).
```

Example 3

```datalogpm
a(X,Z) :- a(X,Y),a(Y,Z).
```

Given two facts for `a`, it generates a third one.

Example 4

```datalogpm
a(1).
c(1,2).
b(Y,X) :- a(X),c(X,Y).

@output("b").
```

`a(1)` is a fact, `b(Y,X) :- a(X),c(X,Y)` is a rule. Observe that `@output("b")` is an annotation and specifies that the facts for b are in the output.


### Facts

The simplest form of linear rule is a **fact**: a ground head-less linear rule.

Example 8

```datalogpm
employee("Jack").
employee("Ruth").
```

### Datalog rules

**Datalog rules** are rules with multiple atoms in the body. They basically define facts of the head predicate, given facts of the body.

Example 9

```datalogpm
project(Z,X) :- employee(X), department(Y,X).
```

For each employee X in a department Y, there exists a project Z in which he participates.

If the atoms in the body do not have variables in common, the Cartesian product is assumed.

Example 10

```datalogpm
employee("Jack").
employee("Ruth").
department("science").
department("finance").
canWork(X,Y,Z) :- employee(X), department(Y).
@output("canWork").
```

Any employee X can work in any department Y on some unknown project Z. The expected result is:

Expected result

```none
canWork("Jack","science",z1). canWork("Jack","finance",z2). canWork("Ruth","science",z3). canWork("Ruth","finance",z4).
```

### [](#_constants_within_rules)Constants within rules

Constants can appear in the atoms of the rules.

When they appear in the head, they denote specific constant values to be generated in the head facts.

When they appear in the body, they denote specific filters, or selection criteria, to be applied to the facts considered in the rule.

Example 11

```datalogpm
employee("Mark").
junior("Mark").
contract(X,"basic",20) :- employee(X),junior(X). % A junior employee will have a "basic" contract, with stipend 20.
@output("contract").
```

The expected result is:

Expected result

```none
contract("Mark","basic",20).
```

Example 12

```datalogpm
employee("Mark","junior").
employee("Ruth","senior").
contract(X,"basic",20) :- employee(X,"junior"). % Any junior employee X will have a "basic" contract with stipend 20. 
contract(X,"advanced",40) :- employee(X,"senior"). % Any senior employee X will have an "advanced" contract with stipend 40.
@output("contract").
```

 Basically, the constants filter the facts to which the rules apply, in such a way that the one for basic contracts applies only to Mark, and the one for advanced contracts applies only to Ruth. The expected result is:

Expected result

```none
contract("Mark","basic",20). contract("Ruth","advanced",40).
```

## [](#_programs)Programs

A program is a set of rules. The order in which the rules are written do not play any role in the reasoning.

## [](#_comments)Comments

Line comments in Vadalog program are denoted by `%`. The syntax is then the following:

```datalogpm
% this is a comment
```

**Data type**

**Examples of constant literals**

* string: e.g. "string literal", "a string", ""

* integer: 1, 3, 5, -2, 0

* double: 1.22, 1.0, -2.3, 0.0

* date: 2012-10-20, 2013-09-19 11:10:00

* boolean: #T for true, #F for false

* set: e.g. {1}, {1,2}, {} for empty set, {"a"} a set with a string, {2.0, 30}

* list: e.g. [1], [1,2], [], ["a"], [2.0,30]

* unknown: used for variables which contain marked nulls.

### String literals

A string value is a finite sequence of Unicode characters. For example, "hello" and "Bob" are strings.

A string literal is a double quote character (", U+0022), followed by zero or more character specifiers, followed by another double quote character.

Each character specifier determines one character that will be included in the string. The possible character specifiers are as follows:

Any character except a double quote, a backslash (\, U+005C), or a newline (U+000A). The character specifies itself for inclusion in the string.

`\"`, indicating a double quote character (`U+0022`).

`\b`, indicating a backspace (`U+0008`).

`\t`, indicating a tab character (`U+0009`).

`\n`, indicating a newline character (`U+000A`).

`\f`, indicating a form feed character (`U+000C`).

`\r`, indicating a carriage return character (`U+000D`).

`\\`, indicating a single backslash (`U+005C`) (but see the note below!).

`\'`, indicating a single quote character (`U+0027`).

`\u` followed by exactly four hexadecimal digits, indicating the Unicode character with the code point given by those hex digits. Hexadecimal digits that are letters may be given in upper or lower case.

#### Integer literals

Values of type **int** are the usual mathematical integers. These values are internally represented as 32 bit two’s complement binary numbers. They must therefore be in the range -(2^32) through 2^(32)-1, or from -2147483648 to 2147483647, inclusive.

The operations use the integer arithmetic of the underlying hardware. So, for example, a result greater than the maximum value may be silently converted to a negative number.

### Double literals

Values of type **double** are binary floating-point numbers, represented according to the IEEE 754 floating point specification. Internally, their representation uses 64 bits.

A floating-point is encoded with an integer part, a decimal fractional part with a dot prefix and/or an exponent over base 10 with prefix `E`, and a suffix `f`. For example, a floating-point number can be written as `2.71f` with a decimal part, `2E3f` with an exponent part (equivalent to `2000.0f`), or `2.71E3f` with both decimal and exponent parts (equivalent to 2710.0f).

The internal representation of floating-point numbers uses the base 2.

If an arithmetic operation produces NaN (for instance, through division by 0), the value is not stored and the operation fails.

If an arithmetic operation produces a `-0`, it is converted and stored as a `+0`.

If an arithmetic operation results in a number that cannot be stored using a 64-bit representation, it is stored as either positive infinity `+inf` or negative infinity `-inf`. Two `+inf` values, even if resulting from different computations, are considered equal. Similarly with two -inf values. Note that Vadalog does not provide any literal representation for infinite float values. Nor is there any explicit way to check whether a value is infinite.

### Date literals

Values of type date are literals of the form `YYYY-MM-DD HH24:MI:SS`. So for example `2010-12-31 12:35:20` is a date literal. If `HH24:MI:SS` is omitted, `00:00:00` is assumed. Internally, they are handled as UTC values.

### Boolean literals

The only two possible values for type Boolean are `#T` (true) and `#F` (false).

### Set literals

Values of type set are literals of the form `{} (empty set), {1,2}, {"a","b"}, {#T,#F}`. Duplicates are automatically eliminated, and the order is neither meaningful nor memorized.

Sets must be homogeneous, that is, they must contain elements of the same data types.

## Variables

Variables in Vadalog are more like variables in algebra than like those of imperative programming languages. **Variables in Vadalog are like variables in first-order logic**.

For example, consider the following statements:

*   "For any man X there exists a father Y"
    
*   "Every father X is a man"
    

These statements can be true or false depending on how we choose to instantiate X and Y, which means, what specific concrete values we choose. There are quantifiers "for any", "every" (or "for all"), namely universal quantification, and "there exists", namely existential quantification.

A Vadalog variable is **local** to the rule in which it occurs. This means that occurrences of the same variable name in different rules refer to different variables.

Variables cannot occur in facts.

A variable such as X is just a **placeholder**. In order to use it in a computation, we must instantiate it, i.e., replace it with a concrete value. The value is called the **instantiation** or **binding**.

There are several ways in which a Vadalog variable can be instantiated.

If the variable occurs in an atom in the body of a rule, the variable can then become instantiated to a value derived from the values in the predicate.

In general, a bound variable should be **positively bound**, i.e., it should have a binding occurrence that is not in the scope of a negation.

Variables in Vadalog need to be capitalized, and can contain underscores.

### Anonymous Variables

To ignore certain predicates in a rule body, one can use anonymous variables using the underscore symbol. Such as in the following example:

```datalogpm
t("Text", 1, 2).
t("Text2", 1, 2).
b(X) :- t(X, _, _).
@output("b").
```

When a universally quantified variable is not used in the head, it can be converted into an anonymous variable (underscore symbol).

HINT: When commenting a Vadalog program, you can highlight the presence of anonymous variables or suggest which one can be made anonymous because they are not used in the head.

### Marked Nulls

A marked null represents an identifier for an unknown value. Marked nulls are produced as a result of: 1. nulls in the data sources (unless the data source supports marked nulls, all of them are assumed to have different identifiers); 2. existential quantification.

The type of a marked null is always unknown.

The following two examples show possible uses of marked nulls.

Example 1

```datalogpm
employee(1).
employee(2).
manager(Y,X) :- employee(X). % Every employee has a manager.
@output("manager").
```

Expected result

```datalogpm
manager(z1,1). manager(z2,2).
```

where `z1` and `z2` are marked nulls, representing that there must be a manager for each of the employees, but their identity is unknown.

Example 2

```datalogpm
employee("Jack").
contract("Jack").
employee("Ruth").
contract("Ruth").
employee("Ann").
hired("Ann","Ruth").
manager(Z,X) :- employee(X). % Every employee X has a manager Y.
hired(Y,X) :- manager(Y,X),contract(X). % If the manager Y sees that there is a pending contract for the respective employee X, then he hires the employee.
contractSigned(X) :- hired(Y,X),manager(Y,Z). % Once a manager Y has hired an employee X, the respective contract X is signed.
@output("contractSigned").
```

If someone has been hired for some reason by an employee who is not a manager, then the contract will not be signed. Observe that the name of the manager is unknown throughout the entire processing. The expected result is:

Expected result

```datalogpm
contractSigned("Jack"). contractSigned("Ruth").
```

# Expressions

An **expression** is inductively defined as follows:

1.  a constant is an expression
    
2.  a variable is an expression
    
3.  a proper combination of expressions (by means of operators is an expression.
    
# Annotations

Annotations are special facts that allow to inject specific behaviors into Vadalog programs. They can be **stand-alone**, **rule level** or **fact level**.

Stand-alone annotations adopt the following syntax: `@annotationName(p1, …​, pn).` where p1...pn are annotation arguments.

Rule-level annotations adopt the following syntax: `@annotationName(p1, …​, pn) a(X) :- b(X,Y),c(Y).`

Multiple rule-level annotations are also supported: `@annotationName1(p1, …​, pm) @annotationName2(p1, …​, pn) a(X) :- b(X,Y),c(Y).`

The fact-level annotations adopt the following syntax: `@annotationName(p1, …​, pn) myFact(1,2,"a").`

Multiple fact-level annotations are also supported: `@annotationName(p1, …​, pn) @annotationName2(p1, …​, pm) myFact(1,2,"a").`

They are all prefixed and whitespace-separated (comma "," denotes conjunction and should not be used here).

In all the syntaxes above, `annotationName` indicates the specific annotation and each of them accepts a specific list of parameters. In the following sections we present the supported annotations.

## Complete Annotation List

@bind: specifies the data source to bind for input/output [Bindings](annotations-bindings.html)

@delete: specifies what data to deletes from the data source [Bindings](annotations-bindings.html)

@executionMode: when `@executionMode("distributed")`, changes the execution modality to Distributed and Parallel (DP) Reasoning (`@executionMode("streaming")` for streaming, the default)

@include: includes a module

@input: specifies the input predicates

@implement: includes external implementation

@library: library import

@mapping: maps the data source to predicate terms and vice versa [Bindings](annotations-bindings.html)

@module: declares of a module

@output: specifies the output predicates

@post: post-processing annotation

@qbind: specifies the query to bind for input/output [Bindings](annotations-bindings.html)

@relaxedSafety: relaxed safety

@saveChaseGraph: saves the chase graph; see [Chase Graph File Creation](annotations-chase.html)

@update: specifies how to update the data source [Bindings](annotations-bindings.html)

Table 2. Temporal annotations  

@config: To configure merge strategies and merge node placement strategy

@temporalMapping: The mapping annotation for temporal interval elements from / to a source

@temporalMappings: A single mapping annotation for all elements of a temporal interval (left boundary bracket, left endpoint, right endpoint, right boundary bracket )

@temporalType: To define the data type for temporal data (Integer, Double, Date…​)

@timeGranularity: To define the time granularity (days, months, hours…​) for the program

@temporal: To define the temporal window for reasoning

@temporalAtom: To define the time granularity (days, months, hours…​) for the program

# Conditions

Rules can be enriched with conditions in order to constrain specific values for variables of the body. Syntactically, the conditions follow the body of the rule. A condition is the comparison (`>,<,=,>=,⇐,<>`) of a variable (the left-hand side of the comparison) of the body and an **expression** (the right-hand side of the comparison).

Notice that although the comparison symbols used in conditions are partially overlapped with the symbols for comparison operators (partially, since we have `=` for equality instead of `==`), they have different semantics. While comparison operators calculate Boolean results, comparison symbols in conditions only specify a filter.

Each rule can have multiple comma-separated conditions.

Example 1

```datalogpm
contract("Mark",14).
contract("Jeff",22).
rich(X) :- contract(X,Y),Y>=20. % we individuate the contracts for Y>=20 and classify the respective employee as rich.
@output("rich").
```

The expected result is:

Expected result

```datalogpm
rich("Jeff").
```

Example 2

```datalogpm
balanceItem(1,7,2,5).
balanceItem(2,2,2,7).
error(E,I) :- balanceItem(I,X,Y,Z),X<>Y+Z. % we individuate the balance items for which X is different from the sum of Y and Z and report an error E for the identifier I of such an item.
@output("error").
```

The expected result is:

Expected result

```datalogpm
error(z1,2).
```

Example 3

```datalogpm
player(1,"Chelsea").
age(1,24).
player(2,"Bayern").
team("Chelsea").
age(2,25).
player(2,"Bayern").
team("Chelsea").
age(2,25).
player(3,"Chelsea").
age(3,18).
team("Chelsea").
team("Bayern").
seniorEnglish(X) :- player(X,Y), team(Y), age(X,A), Y="Chelsea", A>20.
@output("seniorEnglish").
```

It selects the senior English players. They are those who play with Chelsea with age greater than 20. The expected result is:

Expected result

```datalogpm
seniorEnglish(1).
```

# Assignments

Rules can be enriched with assignments in order to generate specific values for existentially quantified variables of the head. Syntactically, the assignments follow the body of the rule. An assignment is the equation (=) of a variable (the left-hand side of the equation) of the body and an expression (the right-hand side of the equation).

Observe that although assignments and equality conditions are denoted by the same symbol (=), assignments and conditions can be unambiguously distinguished, since the left-hand side of the equation appears only in the head.

Each rule can have multiple comma-separated assignments.

Example 1

```datalogpm
balanceItem("loans",23.0).
balanceItem("deposits",20.0).

operations(Q,Z,A) :- balanceItem(I1,X),balanceItem(I2,Y), I1="loans",I2="deposits",Z=X+Y,A=(X+Y)/2.

@output("operations").
```

Example 20 generates a fact for operations, summing two balance items, one for loans and one for deposits. Observe that `I1="loans"` and `I2="deposits"` are conditions to select the balanceItems (as I1 and I2 appear in the body), whereas `Z=X+Y` and `A=(X+Y)/2` are assignments (as Z and A do not appear in the body).

The expected result is:

Expected result

```datalogpm
operations(z1,43,21.5).
```

Example 2

```datalogpm
projects("Mark",1,{1,5,7}).
projects("Mark",2,{4,5,6}).
all(X,P) :- projects(X,D1,P1), projects(X,D2,P2), D1>D2, P=P1|P2.
@output("all").
```

Example 21 calculates all the projects in which an employee is involved. D1>D2 guarantees that we are considering projects led in different departments. P is then calculated in an assignment as the union of the projects in department D1 and in department D2.

The expected result is:

Expected result

```datalogpm
all("Mark",{1, 4, 5, 6, 7}).
```

# Negation

Negation is a prefix modifier that negates the truth value for an atom. In logic terms, we say that a negated formula holds whenever it is false, for example `not employee(X)` holds if X is not an employee. Negation has higher precedence than conjunction, so the single atoms are negated and not the entire body (or parts thereof).

The following assumptions are made:

1.  Every variable that occurs in the head must have a binding in a non-negated atom.
    
2.  Every binding of a variable that occurs only in a negation is not exported outside of the negation.
    

It is clear that assumption 2 implies assumption 1: as the bindings captured within the negation cannot be used outside the negation itself, they cannot be used to generate new facts in the head. However 2 is more specific, since it even forbids joins in the body based on negatively bound variables.

Whereas assumption 1 is enforced in the Engine and its violation causes a runtime error, condition 2 is not enforced and negatively bound joins can be used (albeit discouraged), being aware of the theoretical and practical implications.

Example 1

```datalogpm
employee("Mark").
employee("Ruth").
director("Jane").
hired("Ruth").
contractor("Mark").
project(1,"Mark").
project(2,"Ruth").
project(3,"Jane").

safeProjects(X,P) :- project(X,P), not contractor(P).

@output("safeProjects").
```

The expected result is:

Expected result

```datalogpm
safeProjects(2,"Ruth"). safeProjects(3,"Jane").
```

Here we select the safe projects, which are those run by a person who is not a contractor. Since a person can have various company attributes (`employee`, `hired`, etc.), even at the same time, here we simply check that he/she is not a contractor.

Example 2

```datalogpm
s(1,2).
s(2,3).
s(3,5).
s(4,6).
b(6,2).
b(4,2).
b(2,2).
c(2).

f(X,Y) :- s(X,Y), not b(Y,Z).
f(Y,X) :- f(X,Y), not b(X,Z).

@output("f").
```

The expected result is:

Expected result

```datalogpm
f(5,3). f(2,3). f(3,5).
```

Here we combine recursion and negation and recursively generate f, by negating b.

# Skolem functions

This is an advanced functionality that allows to use user-defined Skolem functions in the assignments and in the conditions of the rules.

A **Skolem function** is a function that takes as input a number of parameters and generates marked nulls. For Skolem functions the following two assumptions hold:

*   Within a program Skolem functions are **range disjoint**. This means that different Skolem function will never generate the same marked null, even if applied to the same input parameters.
    
*   A Skolem function is **deterministic**. This means that in two subsequent applications within the same programs, if the input parameters coincide, the generated marked null will be the same.
    

Example 1

```datalogpm
b(1,2).
a(X,Y,Z) :- b(X,Y),Z=#f(X,Y).
c(K) :- b(X,Y),K=#f(X,Y).
d(K) :- b(X,Y),K=#g(X,Y).

@output("a").
@output("c").
@output("d").
```

The expected output is:

Expected output

```none
a(1,2,z2). c(z2). d(z1).
```

Example 2

```datalogpm
c(1,2,3).
d(2,3,4).

w(Y,J) :- c(X,Y,Z),J=#f(Y,Z).
v(X,J) :- d(X,Y,Z),J=#f(X,Y).
q(X,Z) :- v(X,Y),w(Z,Y).
f(J,X,X) :- q(X,X), J=#f1(X,X).

@output("f").
```

The expected output is:

Expected output

```none
f(z2,2,2).
```

Example 3

```datalogpm
a("a","b","c").
a("a","b","d").
a("a","c","d").
a("a","c","e").

q(J,X) :- a(W,V,X),J=#sk(W,V).
@output("q").
```

The expected output is:

Expected output

```none
q(z1,"c"). q(z1,"d"). q(z2,"d"). q(z2,"e").
```

Example 4

```datalogpm
sequelOf(0,2,"a").
sequelOf(5,3,"a").
followOn(1,2,"a").
followOn(2,2,"a").

sequelSynt(X,J) :- sequelOf(X,Y,Z), J = #f(Y,Z).
q(X,W) :- sequelSynt(X,J), followOn(W,Y,Z), J= #f(Y,Z).

@output("q").
```

The expected output is:

Expected output

```none
q(0,1). q(0,2).
```

Example 5

```datalogpm
a(1,2,3,4).
a(2,3,4,5).
a(2,3,6,5).
a(4,3,6,5).

a(X,Y,Z,K) :- a(X,C,Z,K), Y = #f1(K).
b(X,Y,Z,K,Q) :- a(X,Y,Z,K), Y = #f1(K), Q=#f2(X).

@output("b").
```

The expected output is:

Expected output

```none
b(1,z1,3,4,z3). b(2,z2,4,5,z4). b(2,z2,6,5,z4). b(4,z2,6,5,z5).
```

# Equality-generating dependencies

### Contents

Equality-generating dependencies (EGD) are an advanced feature that allows to embed constraints to be satisfied within a program.

More specifically, EGDs allow us to unify values that are binded to the variables at runtime. The variables to be equated appear in a pseudo-head (called equality atom), whereas the conditions are expressed in the body.

In general, an EGD has the form: `X=Y :- body`

Suppose we have X and Y in the head of an EGD as the example above then we have three different scenarios depending on what value X and Y are binded to at runtime.

*   If X (resp. Y) is binded to a marked null and Y (resp. X) is binded to a constant, the value of X (resp. Y) will be replaced by the value of Y (resp. X), in other words, X becomes a constant value
    
*   If X (resp. Y) is binded to a marked null and Y (resp. X) is binded to another marked null, the both values are replaced by the same marked null
    
*   If X (resp. Y) is binded to a constant and Y (resp. X) is binded to another constant, we throw a unifying failure, meaning that the reasoning process has failed
    
Let us show uses of EGDs with some examples.

Example 1

```datalogpm
edge(1,2).
edge(2,1).
edge(1,3).
conn(X,Y,Z):- edge(X,Y).
conn(Y,X,Z):- edge(X,Y).
Z1=Z2 :- conn(X,Y,Z1),conn(Y,Z,Z2).
@output("conn").
```

Expected result

```none
conn(1,2,z1)
conn(2,1,z1)
conn(1,3,z1)
conn(1,2,z1)
conn(2,1,z1)
conn(3,1,z1)
```

Example 2

```datalogpm
edge(1,2).
edge(2,1).
edge(1,3).
conn(X,Y,Z):- edge(X,Y).
Z1=Z2 :- conn(X,Y,Z1),conn(Y,Z,Z2).
Z1=Z2 :- conn(X,Y,Z1),conn(X,Z,Z2).
Z1=Z2 :- conn(X,Y,Z1),conn(Z,Y,Z2).
Z1=Z2 :- conn(X,Y,Z1),conn(Z,X,Z2).
@output("conn").
```

The programs in the example above find the edges of the same connected component in an undirected graph. The first two TGDs label each edge with a different marked null, then the EGDs unify the marked null of the edges that share a node. The output will be:

Expected result

```none
conn(1,2,z1), conn(2,1,z1) and conn(1,3,z1).
```

## Harmless EGDs

VadaEngine supports reasoning with EGDs under some constraints. We say that a set of EGDs is harmless if for every TGD in the program the following conditions hold: - every variable that appears in a tainted position appears only once in the body - there are no constants in tainted positions

Where a position is tainted if:

*   the program contains an EGD where a variable X appears in the position in the body, X is harmful and appears in an equality atom in the head
    
*   pos is the position of the variable X in the head and X appears in a tainted position in the body (forward propagation)
    
*   pos is the position of the variable X in the body and X appears in a tainted position in the head (backward propagation)
    

These constrains are checked by VadaEngine before the reasoning starts, if they are not satified an exception will be thrown.

## T-Isomorphism Termination Strategy

When reasoning with EGDs t-isomorphism termination strategy is automatically enabled to guarantee the reasoning process correctness. This allows to have t-isomorphic facts in the output.

# Negation as failure

Negation as failure is a special constrain that makes the reasoning process to fail when some conditions at runtime are verified. These constrains are expressed as rules which have the false symbol `#F` in the head.

In general, a Failure rule has the form: `#F :- body`. When the failure rule is activated (the body atoms are unified) at runtime the system will throw an exception and it will stop the reasoning process. Let us show uses with examples.

Example 1

```datalogpm
edge(1,2).
edge(2,1).
edge(1,3).
path(X,Y):- edge(X,Y).
path(X,Z):- edge(X,Y), path(Y,Z). % computes the usual transitive closure of the binary relation `edge`
#F :- path(X,X). % if the graph (described by the edge relation) contains a cycle, the failure rule is activated by throwing an exception
@output("path").
```

Example 2

```datalogpm
c(Id, Name) :- company(Id, Name, Revenue).
#F :- c(Id, Name1), c(Id, Name2), Name1 <> Name2.
@output("c").
```

The above example checks the uniqueness of the Id attribute for the `company` relation. When two companies have the same Id but different names then the reasoining process will fail.

[PAGE BOUNDARY]

# Aggregation operators

### Contents

Aggregation operators evaluate a given function over a set of facts. They can be used in expressions that are the right-hand side of assignments; this means that, unlike single fact-operators, they cannot be used in conditions.

The supported aggregations are:

`msum`: monotonic increasing summation

`mprod`: monotonic decreasing product

`munion`: monotonic increasing set union

`mmin`: monotonic minimum

`mmax`: monotonic maximum

`mcount`: monotonic count

`min`: minimum

`max`: maximum

`count`: count

Note that aggregates are only implemented for floats.

A rule with an assignment using an aggregation operator has the general form:

`q(K1, K2, Kn, J) :- body, J = maggr(x, <C1,…​,Cm>)`

Where:

*   `K1, …​, Kn` are zero or more group by arguments.
    
*   `body` is the rule body.
    
*   `maggr` is a placeholder for an aggregation function (`mmin`, `mmax`, `msum`, `mprod`).
    
*   `C1, …​, Cm` are zero or more variables of the body, called contributor arguments (with Ci ≠ Kj, 1 ≤ i ≤ m, 1 ≤ j ≤ n).
    
*   `x` is a constant, a body variable, or an expression containing only single-fact operators.
    

Contributors `C1, …​, Cm` are _not_ present in `munion`, `mmax` and `mmin`.

For each distinct n-tuple of `K1, …​, Kn`, a monotonic decreasing (increasing) aggregate function `maggr` maps an input multi-set of vectors G, each of the form gi = (C1,…​,Cm,xi) into a set D of values, such that xi is in D if xi is less (greater) than the previously observed value for the sub-vector of contributors (C1, …​, Cm). Such aggregation functions are monotonic with respect to set containment and can be used in Vadalog together with recursive rules to calculate aggregates without resorting to stratification (separation of the program into ordered levels based on the dependencies between rules).

During the execution of a program:

*   The aggregation memorizes the current minimum (or maximum) value of `x` for each vector (C1, …​, Cm).
    
*   For each activation of a rule with the monotonic aggregation, an updated value for the group selected by `K1, …​, Kn` is calculated by combining all the values in D for the various vectors of contributors.
    
*   The combination depends on the semantics of `maggr` (e.g., minimum, maximum, sum, product, count) and is calculated by memorizing a current aggregate, updated with new contributions from the sequence of rule activations.
    

Assumption:

*   If a position `pos` in a head for predicate `p` is calculated with an aggregate function, whenever a head for `p` appears in any other rule, `pos` must be existentially quantified and calculated with the same aggregate function.
    

This assumption ensures the homogeneity of the facts with existentially aggregated functions.

## [](#_msum)`msum`

Monotonic increasing summation.

```datalogpm
msum(X, <C1,...,Cm>)
```

Where:

*   `X` is the value to be summed.
    
*   `<C1,…​,Cm>` are zero or more variables of the body, which are called contributor arguments.
    

Example

```datalogpm
s(0.1, 2, "a").
s(0.2, 2, "a").
s(0.5, 3, "a").
s(0.6, 4, "b").
s(0.5, 5, "b").

f(J, Z) :- s(X, Y, Z), J = msum(X, <Y>).
@output("f").
```

Expected results

```none
f(0.1, "a")
f(0.2, "a")
f(0.7, "a")
f(0.6, "b")
f(1.1, "b")
```

# Bindings

These annotations (`@bind`, `@mapping`, `@qbind`) allow to customize the data sources for the `@input` annotation or the targets for the `@output` annotation.

## @bind

`@bind` binds an input or output atom to a source. The syntax for `@bind` is the follows:

```datalogpm
@bind("atomName","data source","outermost container","innermost container").
```

where `atomName` is the atom we want to bind, `data source` is the name of a source defined in the Vadalog configuration, `outermost container` is a container in the data source (e.g., a schema in a relational database), `innermost container` is a content in the data source (e.g. a table in a relational database).

Example 1

```datalogpm
@input("m"). % Reads the facts for `m`
@input("q").
@output("m").
@bind("m","postgres","doctors_source","Medprescriptions"). % `m` comes from a Postgres data source, specifically from schema `doctors_source` and table `Metprescriptions`.
@bind("q","sqlite","doctors_source","Medprescriptions"). % reads facts for `q` from a SQLite (in SQLite the schema is ignored) data source
m(X) :- b(X),q(X). % performs a join
```

### Bind multiple sources to an input predicate

You can bind multiple external sources (csv, postgres, sqlite, neo4j, …​) to a single input predicate. In this example we have a graph partitioned in a csv file and a postgres database and we bind them to the predicate `edge`. As a result the facts from the two sources are merged into `edge`.

```datalogpm
@input("edge").
@output("path").
path(X,Y) :- edge(X,Y).
path(X,Z) :- edge(X,Y),path(Y,Z).
@bind("edge","csv","path/to/myCsv1/","graph_partition_1.csv").
@bind("edge","postgres","graph_source_db","graph_partition_2_table").

@output("path").
```

## @mapping

`@mapping` maps specific columns of the input/output source to a position of an atom. An atom that appears in a `@mapping` annotation must also appear in a `@bind` annotation.

The syntax is the following:

```datalogpm
@mapping("atomName",positionInAtom,"columnName","columnType").
```

where `atomName` is the atom we want to map, `positionInAtom` is an integer (from 0) denoting the position of the atom that we want to map; `columnName` is the name of the column in the source (or equivalent data structure), `columnType` is an indication of the type in the source. The following types can be specified: **string**, **int**, **double**, **boolean** and **date**.

Example 2

```datalogpm
@input("m").
@bind("m","postgres","doctors_source","Medprescriptions").
@mapping("m",0,"id","int").
@mapping("m",1,"patient","string").
@mapping("m",2,"npi","int").
@mapping("m",3,"doctor","string").
@mapping("m",4,"spec","string").
@mapping("m",5,"conf","int").
```

In this example, we map the columns of the `Medprescriptions` table.

Observe that **mappings can be omitted** for both `@input` and `@output` atoms. In such case they are automatically inferred from the source (target); the result can be however unsatisfactory depending on the sources, since some of them do not support positional reference to the attributes.

Positions are 0-based.

## @qbind

`@qbind` binds an input atom to a source, generating the facts for the atom as the result of a query executed on the source.

The syntax is the following:

```datalogpm
@qbind("atomName","data source","outermost container","query").
```

where `atomName` is the atom we want to bind, `data source` is the name of a source defined in the Vadalog configuration, `outermost container` is a container in the data source (e.g., a schema in a relational database), `query` is a query in the language supported by the source (e.g., SQL for relational databases).

Example 3

```datalogpm
@qbind("t","postgres","vada","select * from ""TestTable"" where id between 1 and 2").
```

Here we bind atom `t` to the data source postgres, selecting a specific content from the table `TestTable`.

You can also use parametric `@qbind`, for example:

Example 4

```datalogpm
qbind("t","postgres","vada","select * from ""TestTable"" where id = $\{1}").
```

where `${1}` is a parameter, which will have the values of the first input field `t`. Parametric `@qbind` should be used in joins with other atoms.

You can also use multiple parameters within a parametric `@qbind`:

Example 5

```datalogpm
@qbind("t","postgres","vada","select * from ""TestTable"" where id = $\{1} and field = $\{2}").
```

where `${1}` and `${2}` are the first and second parameters of all `t` results.

## @delete

`@delete` annotation specifies what data should be removed from a datasource. The syntax is the following:

```datalogpm
@delete("atomName","set of key positions").
```

The delete annotation must be accompanied with a `@bind` annotation that binds `"atomName"` with a data source.

Positions are 0-based.

Example

```datalogpm
q("a", "b").
q("c", "d").
p(X, Y) :- q(X, Y).
@bind("p", "postgres", "schema_test", "test_table").
@delete("p", {0}).
```

Suppose the `"test_table"` contains facts `test_table(a, 1), test_table(a,2), test_table(d, 1)`. The result of executing the program is:

Expected result

```datalogpm
test_table(d, 1)
```

Indeed, `p` contains facts with `"a"` and `"c"` on the key position(s) defined in the delete annotation, and thus rows with these values on the key positions are deleted from `test_table`.

## @update

The `@update` annotation is similar to `@delete`. It specifies how a data source is updated. The syntax is the following:

```datalogpm
@update("atomName","set of key positions").
```

The update annotation must be accompanied with a `@bind` annotation that binds `"atomName"` with a data source. The result of this command is an update in the datasource that is bind with `"atomName"`.

Positions are 0-based.

Example

```datalogpm
q("a", "b").
q("c", "d").
p(X,Y) :- q(X,Y).
@bind("p", "postgres", "schema_test", "test_table").
@update("p", {0}).
```

Suppose the `"test_table"` contains facts `test_table(a, b), test_table(a,2), test_table(c, e)`. The result of executing the program is the facts

Expected result

```datalogpm
test_table(a, b), text_table(a, b) and test_table(c,d)
```

Indeed, p contains facts with "a" and "c" on the key position(s) from the `@update`, and thus rows with these values on the key positions are updated with the inferred data. Note that updates can result in duplicates in the data source.

# Input

It specifies that the facts for an atom of the program are imported from an external data source, for example a relational database.

The syntax is the following:

```datalogpm
@input("atomName").
```

where `atomName` is the atom for which the facts have to be imported from an external data source.

It is assumed that an atom annotated with `@input`:

1.  never appears as the head of any rule
    
2.  it is never used within an `@output` annotation.
    

The full details of the external source must be specified with the `@bind`, `@mapping` and `@qbind` annotations.

# Library imports

### Contents

The `@library` annotation allows to import library functions implemented in the Java source.

Syntax

```datalogpm
@library("alias:", "libraryName"[, "methodName", "parameterString"]).
```

Where:

*   `alias` is the name the user wants to call the library as inside the program;
    
*   `libraryName` is the name of the library to invoke.
    
*   `methodName` (_optional_) is the name of the method to import
    
*   `parameterString` (_optional_) the string of parameters (mainly used in the machine learning libraries)
    

For example, to use the `collections` library, you can write:

```datalogpm
@library("c:", "collections").
```

The alias here is "c", but the name is arbitrary and is chosen by the user. The colon is always present.

## Usage:

Let us assume we want to call the `size()` function to compute the size of a collection.

```datalogpm
collectionSize(S):- collection(X), S = c:size(X).
```

# Output

It specifies that the facts for an atom of the program will be exported to an external target, for example the standard output or a relational database.

The syntax is the following:

```datalogpm
@output("atomName").
```

where `atomName` is the atom for which the facts have to be exported into an external target.

It is assumed that an atom annotated with `@output`:

1.  does not have any explicit facts in the program,
    
2.  is never used within an `@input` annotation.
    

If the `@output` annotation is used without any `@bind` annotation, it is assumed that the default target is the standard output. Annotations `@bind` and `@mapping` can be used to customize the target system.

# Relaxed Safety

```datalogpm
@relaxedSafety.
```

The computational properties of the engine are guaranteed by safety checks (e.g. wardedness and linearity). These conditions on the program guarantee that the evaluation will terminate computing the correct result. In many cases where there is interaction between Skolem functions, aggregate functions and user-defined functions, these conditions become very restrictive, and many programs are unnecessarily refused by the engine. The engine supports a relaxed mode of operation whereby Skolem functions and existential variables are treated separately from built-in and user-defined functions. This mode of operation is more permissive, but programs that are accepted may not be safe in general. To trigger this mode of operation one should use the program annotation `@relaxedSafety`. The following program, deemed unsafe in the default mode of operation, is accepted with the annotation `@relaxedSafety`, and computes the (non-monotonic) sum aggregate on the relation `a`.

Example

```datalogpm
a(1, 2).
a(1, 3).
a(1, 4).
a(2, 2).
a(2, 4).

a_msum(X, Z) :- a(X, Y), Z = msum(Y).
a_msum_red(X, Z1) :- a_msum(X, Z1), a_msum(X, Z2), Z2 > Z1 .
a_sum(X, Z) :- a_msum(X, Z), not a_msum_red(X, Z).

@output("a_sum").

@relaxedSafety.
```

The output of the program is:

Expected output

```datalogpm
a_sum(1, 9). a_sum(2, 6).
```

# Comparison operators

The comparison operators are `==`,`>`,`<`,`>=`,`<=`,`<>` (alternate syntax `!=`). They can be used to compare literals of any data type and return a Boolean, depending whether the comparison is satisfied or not. Only values of the same type can be compared. Marked nulls can be compared only with marked nulls, since they are the only ones having unknown data type. Marked nulls are equal when they have the same identifier (i.e., the same marked null).

*   `==` : equals to
    
*   `>` : greater than
    
*   `<` : less than
    
*   `>=` : greater or equal
    
*   `<=` : less or equal
    
*   `<>` : not equal
    
*   `!=` : not equal

# Arithmetic operators

The arithmetic operators are:

*   `*` (multiplication)
    
*   `/` (division)
    
*   `+` (addition)
    
*   `-` (subtraction)
    

Infix `*`,`/`,`+`,`-` can be applied to all numeric (integer and double) operands, with an implicit upcast to double if any double is involved.

The operator `+` (plus) also performs string concatenation with an implicit upcast to string if any string is involved.

The operator `-` (minus) also exists in its monadic version, which simply inverts the signum of a numeric value.

Division by 0 always fails, causing the program to abort.

Operations associate to the left, except that multiplication and division operators have higher precedence than addition and subtraction operators. Precedence can be altered with parentheses.

# Boolean operators

The Boolean operators are:

*   `and` (corresponding to `&&`)
    
*   `or` (corresponding to `||`)
    
*   `not`
    
They can be used to combine Boolean data types.

# String operators

* `a("vadaengine"). b("oxford"). q(Y, J) :- a(X), b(Y), J = substring(X, 4, 10).` — `substring` returns the substring of `X` from index 4 (inclusive) to 10 (exclusive), zero‑based. **Expected →** `q("oxford", "engine")`.

* `a("vadaengine"). b("engine"). q(X, Y, J) :- a(X), b(Y), J = contains(X, Y).` — `contains` is `#T` if `X` contains `Y`. **Expected →** `q("vadaengine", "engine", #T)`.

* `a("vadaengine"). b("vada"). q(X, Y, J) :- a(X), b(Y), J = starts_with(X, Y).` — `starts_with` is `#T` if `X` begins with `Y`. **Expected →** `q("vadaengine", "vada", #T)`.

* `a("vadaengine"). b("engine"). q(X, Y, J) :- a(X), b(Y), J = ends_with(X, Y).` — `ends_with` is `#T` if `X` ends with `Y`. **Expected →** `q("vadaengine", "engine", #T)`.

* `a("vada"). b("engine"). q(X, Y, J) :- a(X), b(Y), J = concat(X, Y).` — `concat` concatenates two strings. **Expected →** `q("vada", "engine", "vadaengine")`.

* `a("vada"). b(1.0). q(X, Y, J) :- a(X), b(Y), J = X + Y.` — `+` performs string concatenation when any operand is a string; non‑strings are converted with `toString`. **Expected →** `q("vada", 1.0, "vada1.0")`.

* `a("vadaengine"). b("engi"). q(X, Y, J) :- a(X), b(Y), J = index_of(X, Y).` — `index_of` returns the zero‑based index of the first occurrence of `Y` in `X`. **Expected →** `q("vadaengine", "engi", 4)`.

* `a("vadaengine"). q(X, J) :- a(X), J = string_length(X).` — `string_length` returns the number of characters in `X`. **Expected →** `q("vadaengine", 10)`.

* `a([0, 1, 2, 3, 4, 5], 1, 3). b(P) :- a(X, Y, Z), P = substring(X, Y, Z).` — List `substring` returns the sublist of `X` from index `Y` (inclusive) to `Z` (exclusive), zero‑based. **Expected →** `b([1, 2])`.

* `a([0, 1, 2, 3, 4, 5]). b(3). b(2). c(Y, J) :- a(X), b(Y), J = contains(X, Y).` — List `contains` is `#T` if `X` contains element `Y`. **Expected →** `c(3, #T)` and `c(2, #F)`.

* `a([0, 1, 2, 3, 4, 5]). b([0, 1]). b([0, 1, 3]). c(Y, J) :- a(X), b(Y), J = starts_with(X, Y).` — `starts_with` is `#T` if the second list is a prefix of the first. **Expected →** `c([0, 1], #T)` and `c([0, 1, 3], #F)`.

* `a([0, 1, 2, 3, 4, 5]). b([4, 5]). b([2, 4, 5]). c(Y, J) :- a(X), b(Y), J = ends_with(X, Y).` — `ends_with` is `#T` if the first list ends with the second. **Expected →** `c([4, 5], #T)` and `c([2, 4, 5], #F)`.

* `a(["a", "b"], [1, 2]). a(["a", "b"], "c"). c(J) :- a(X, Y), J = concat(X, Y).` — List `concat` appends `Y` to `X`; if only one operand is a list, the other is treated as a single‑element list. **Expected →** `c(["a", "b", 1, 2])` and `c(["a", "b", "c"])`.

* `a(["a", "b"], [1, 2]). a(["a", "b"], "c"). c(J) :- a(X, Y), J = X + Y.` — `+` acts as list concatenation when any operand is a list (scalars lifted to one‑element lists). **Expected →** `c(["a", "b", 1, 2])` and `c(["a", "b", "c"])`.

* `a([0, 1, 2, 3, 4, 5]). b(J) :- a(X), J = string_length(X).` — For lists, `string_length` returns the number of elements. **Expected →** `b(6)`.

# Post-processing

This category of annotations include a set of post-processing operations that can be applied to facts of atoms annotated with @output before exporting the result into the target. Observe that also if the result is simply sent to the standard output, the post-processing is applied before.

The syntax is the following:

```datalogpm
@post("atomName","post processing directive").
```

where `atomName` is the name of the atom (which must also be annotated with `@output`) for which the post-processing is intended and `post processing directive` is a specification of the post-processing operation to be applied.

Multiple post-processing annotations can be used for the same atom, in case multiple transformations are desired.
* all indices in @post calls are 1-based.
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
