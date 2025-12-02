// SPDX-License-Identifier: SSPL-1.0
// Copyright (c) 2023-present Banca d'Italia

/*  _   __        __                 __
 * | | / /__ ____/ /__ ________  ___/ /__
 * | |/ / _ `/ _  / _ `/ __/ _ \/ _  / -_)
 * |___/\_,_/\_,_/\_,_/\__/\___/\_,_/\__/
 *
 * @file ANTLR4 grammar for Datalog+/-.
 */

// Grammar name determines lexer and parser class names
grammar Datalogpm;

// Program definition
// Introduce EOF to force complete parsing of the input
program  : ( clause )* EOF;

// Parser rules --------------------------------------------------------------

clause :  comment | annotation | fact | rrule ;

comment: BLOCK_COMMENT | LINE_COMMENT;

fact :  annotationBody* atom temporalAnnotation? DOT ;

annotationBody : AT atom ;
annotation : annotationBody DOT ;

temporalAnnotation: AT temporalInterval;

rrule :  annotationBody* head IMPLICATION  body DOT  ;

head :  annotationAtom ( ',' annotationAtom )* | egdHead | falseHead ;

falseHead : falseTerm ;

egdHead : varTerm '=' varTerm;

body  : literal ( ',' literal )*  ( ',' condition )* ;

literal: literalInner;
literalInner: annotationAtom #PosLiteral
         | 'not' annotationAtom #NegLiteral
         | 'dom(*)' #domStar
         | diamondMinusOperator annotationAtom #diamondMinusLiteral
         | diamondPlusOperator annotationAtom #diamondPlusLiteral
         | boxMinusOperator annotationAtom #boxMinusLiteral
         | boxPlusOperator annotationAtom #boxPlusLiteral
         | triangleUpOperator annotationAtom #triangleUpLiteral
         | triangleDownOperator annotationAtom #triangleDownLiteral         
         | closeIntervalOperator annotationAtom #closeIntervalLiteral
         | selectIntervalOperator annotationAtom #selectIntervalLiteral
         | annotationAtom sinceOperator annotationAtom #sinceLiteral
         | annotationAtom untilOperator annotationAtom #untilLiteral
         ;

condition : 
	gtCondition
	| ltCondition
	| geCondition
	| leCondition
	| eqCondition
	| neqCondition 
	| inCondition
	| notInCondition ;

gtCondition : varTerm GT expression ;
ltCondition : varTerm LT expression ;
geCondition : varTerm GE expression ;
leCondition : varTerm LE expression ;
eqCondition : varTerm EQ expression ;
neqCondition : varTerm NEQ expression ;
inCondition : varTerm IN expression ;
notInCondition : varTerm NOTIN expression ;

expression : 
			LBR expression RBR # precExpression
			| expression PROD expression # prodExpression
			| expression DIV expression # divExpression
			| MINUS expression # unaryMinusExpression
			| expression PLUS expression # plusExpression
			| expression UNION expression #unionExpression
			| expression INTERSECTION expression #intersectionExpression
			| expression MINUS expression # minusExpression 
			| NOT expression # notExpression
			| expression LT expression # ltExpression
			| expression LE expression # leExpression
			| expression GT expression # gtExpression
			| expression GE expression # geExpression
			| expression EQEQ expression # eqEqExpression
			| expression NEQ expression # neqExpression
			| expression AND expression # andExpression
			| expression OR expression # orExpression
			| aggregation # aggrExpression
			| stringOperators # stringOperatorsExpression
			| SKOLEM_SYMBOL ID ('(' expression ( ',' expression )* ')') # skolemExpression
			| ID ('(' expression ( ',' expression )* ')') # externalExpression
			| term # termExpression ;
			
aggregation : 
			AGGR_MSUM '(' expression ( ',' varList )? ')'  # msumAggExpression
			| AGGR_MPROD '(' expression ( ',' varList )? ')' # mprodAggExpression
			| AGGR_MCOUNT '(' expression ( ',' varList )? ')' # mcountAggExpression
			| AGGR_MUNION '(' expression ( ',' varList )? ')' # munionAggExpression
			| AGGR_MMAX'(' expression ')' # mmaxAggExpression
			| AGGR_MMIN '(' expression ')' # mminAggExpression
			| AGGR_UNION '(' expression ( ',' varList )? ')' # unionAggExpression
			| AGGR_LIST '(' expression ( ',' varList )? ')' # listAggExpression
			| AGGR_SET '(' expression ( ',' varList )? ')' # setAggExpression
			| AGGR_MIN '(' expression ')' # minAggExpression
			| AGGR_MAX '(' expression ')' # maxAggExpression
			| AGGR_SUM '(' expression ( ',' varList )? ')' # sumAggExpression
			| AGGR_PROD '(' expression ( ',' varList )? ')' # prodAggExpression
			| AGGR_AVG '(' expression ( ',' varList )? ')' # avgAggExpression
			| AGGR_COUNT '(' expression ( ',' varList )? ')' # countAggExpression ;
			
stringOperators :
			STRING_SUBSTRING '(' expression ',' expression ',' expression ')' # substringExpression
			| STRING_CONTAINS '(' expression ',' expression ')' #containsExpression
			| STRING_STARTS_WITH '(' expression ',' expression ')' #startsWithExpression
			| STRING_ENDS_WITH '(' expression ',' expression ')' #endsWithExpression
			| STRING_CONCAT '(' expression ',' expression ')' #concatExpression
			| STRING_STRING_LENGTH '(' expression ')' #stringLengthExpression
			| STRING_INDEX_OF '(' expression ',' expression ')' #indexOfExpression;

varList : '<' VAR ( ',' VAR )* '>' ;

SKOLEM_SYMBOL : '#' ;

annotationAtom: atom atomAnnotation;
atomAnnotation: (annotationBody)*;
atom : ID ('(' term ( ',' term )* ')')?;

temporalInterval: temporalTermStart temporalTermStartValue ',' temporalTermEndValue temporalTermEnd;

temporalRelativeIntervalNumber: temporalRelativeTermStart temporalRelativeTermStartValue ',' temporalRelativeTermEndValue temporalRelativeTermEnd;
temporalRelativeIntervalPeriod: temporalRelativeTermStart temporalRelativeTermStartDate ',' temporalRelativeTermEndDate temporalRelativeTermEnd;
temporalRelativeInterval: temporalRelativeIntervalPeriod | temporalRelativeIntervalNumber;

temporalSelectInterval: temporalSelectTermStart temporalSelectTermStartValue ',' temporalSelectTermEndValue temporalSelectTermEnd;

temporalTermStart: '(' #temporalTermOpenStart
               | '[' #temporalTermCloseStart
               ;
temporalTermEnd:   ')' #temporalTermOpenEnd
               | ']' #temporalTermCloseEnd
               ;

temporalTermStartValue: temporalTermDate #temporalTermStartValueDate
                    | temporalTermNumber #temporalTermStartValueNumber
                    | '-' temporalTermInfty #temporalTermStartValueInfty;
temporalTermEndValue: temporalTermDate #temporalTermEndValueDate
                    | temporalTermNumber #temporalTermEndValueNumber
                    | temporalTermInfty #temporalTermEndValueInfty;

temporalSelectTermStart: '(' #temporalSelectTermOpenStart
               | '[' #temporalSelectTermCloseStart
               ;
temporalSelectTermEnd:   ')' #temporalSelectTermOpenEnd
               | ']' #temporalSelectTermCloseEnd
               ;

temporalSelectTermStartValue: temporalTermDate #temporalSelectTermStartValueDate
                    | temporalTermNumber #temporalSelectTermStartValueNumber
                    | temporalTermInfty #temporalSelectTermStartValueInfty;
temporalSelectTermEndValue: temporalTermDate #temporalSelectTermEndValueDate
                    | temporalTermNumber #temporalSelectTermEndValueNumber
                    | temporalTermInfty #temporalSelectTermEndValueInfty;


temporalRelativeTermStart: '(' #temporalRelativeTermOpenStart
               | '[' #temporalRelativeTermCloseStart
               ;
temporalRelativeTermEnd:   ')' #temporalRelativeTermOpenEnd
               | ']' #temporalRelativeTermCloseEnd
               ;

temporalRelativeTermStartValue: temporalTermNumber #temporalRelativeTermStartValueNumber;
temporalRelativeTermStartDate: iso8601Duration #temporalRelativeTermStartValueDate;
temporalRelativeTermEndValue: temporalTermNumber #temporalRelativeTermEndValueNumber
                        | temporalTermInfty #temporalRelativeTermEndValueInfty;
temporalRelativeTermEndDate: iso8601Duration #temporalRelativeTermEndValueDate
                        | temporalTermInfty #temporalRelativeTermEndValueInftyDate;

temporalTermDate: dateConstTerm;
temporalTermNumber: integerConstTerm | doubleConstTerm;
temporalTermInfty: 'infty';

diamondMinusOperator: diamondMinusSymbol temporalRelativeInterval;
boxMinusOperator: boxMinusSymbol temporalRelativeInterval;
diamondPlusOperator: diamondPlusSymbol temporalRelativeInterval;
boxPlusOperator: boxPlusSymbol temporalRelativeInterval;
sinceOperator: sinceSymbol temporalRelativeInterval;
untilOperator: untilSymbol temporalRelativeInterval;
triangleUpOperator: triangleUpSymbol timeGroupInfo;
triangleDownOperator: triangleDownSymbol timeGroupInfo;

closeIntervalOperator: closeIntervalSymbol;
selectIntervalOperator: selectIntervalSymbol temporalSelectInterval;

diamondPlusSymbol: '<+>';
diamondMinusSymbol: '◆' | '<->';
sinceSymbol: '<S>';
untilSymbol: '<U>';
boxMinusSymbol: '■' | '[-]';
boxPlusSymbol: '[+]';
triangleUpSymbol: '/\\';
triangleDownSymbol: '\\/';
closeIntervalSymbol: '©' | '(c)';
selectIntervalSymbol: '(s)';
timeGroupInfo: timeGroupInfoInteger | timeGroupInfoDouble;
timeGroupInfoInteger: (integerConstTerm timeUnit integerConstTerm?);
timeGroupInfoDouble: (doubleConstTerm timeUnit doubleConstTerm?);
timeUnit: 'years' | 'months' | 'days' | 'hours' | 'minutes' | 'seconds' | 'no_date';

term : booleanConstTerm | stringConstTerm | integerConstTerm | doubleConstTerm | dateConstTerm | setConstTerm | listTerm | varTerm | anonTerm;

stringConstTerm : STRING;
integerConstTerm: INTEGER;
doubleConstTerm: DOUBLE;
booleanConstTerm : TRUE | FALSE;
dateConstTerm : DATE;

listTerm :
        '[' ']' #list
    |   '[' expression (',' expression)* ']' #list
;

setConstTerm :
	    '{' '}' #emptySet
	|   '{' STRING ( ',' STRING )* '}' #stringSet
	|   '{' INTEGER ( ',' INTEGER )* '}' #integerSet
	|   '{' DOUBLE ( ',' DOUBLE )* '}' #doubleSet
	|   '{' DATE ( ',' DATE )* '}' #dateSet;
	
varTerm : VAR;
anonTerm : ANON_VAR;

falseTerm : FALSE;

// ISO 8601 duration ------

iso8601Duration: ISO_8601_DURATION1 #iso8601DurationDefault | ISO_8601_DURATION2 #iso8601DurationWeek; // | ISO_8601_DURATION3 #iso8601DurationDatetime; //'#P' iso8601Duration1 |iso8601Duration2|iso8601Duration3;

fragment HelperDurationValue: ('0'..'9')+ (('.'| ',') ('0'..'9')+)?;
ISO_8601_DURATION1: '#P' (HelperDurationValue 'Y')? (HelperDurationValue 'M')? (HelperDurationValue 'D')? ('T' (HelperDurationValue 'H')? (HelperDurationValue 'M')? (HelperDurationValue 'S')?)? ;
ISO_8601_DURATION2: '#P' (HelperDurationValue 'W');

// Lexer tokens --------------------------------------------------------------

// Language keywords ------
AGGR_MSUM : 'msum' ;
AGGR_MPROD : 'mprod' ;
AGGR_MCOUNT: 'mcount' ;
AGGR_MUNION: 'munion' ;
AGGR_MMAX: 'mmax' ;
AGGR_MMIN: 'mmin' ;
AGGR_UNION: 'union' ;
AGGR_LIST: 'list' ;
AGGR_SET: 'set' ;
AGGR_MIN: 'min' ;
AGGR_MAX: 'max' ;
AGGR_SUM: 'sum' ;
AGGR_PROD: 'prod' ;
AGGR_AVG: 'avg' ;
AGGR_COUNT: 'count' ;

STRING_SUBSTRING: 'substring' ;
STRING_CONTAINS: 'contains' ;
STRING_STARTS_WITH: 'starts_with' ;
STRING_ENDS_WITH: 'ends_with' ;
STRING_CONCAT: 'concat' ;
STRING_STRING_LENGTH: 'string_length' ;
STRING_INDEX_OF: 'index_of' ;

// Symbols ------

DOT: '.';

ID   : ('a'..'z') ('a'..'z'|'A'..'Z'|'0'..'9'|'_'|'<'|'>'|':')* ;

VAR : ('A'..'Z') ('a'..'z'|'A'..'Z'|'0'..'9'|'_')* ;

ANON_VAR : ('_') ;

STRING : '"' (~'"' | '""')* '"' ;

DATE : ('0'..'9')('0'..'9')('0'..'9')('0'..'9') '-' ('0'..'9')('0'..'9') '-' ('0'..'9')('0'..'9') (' ' ('0'..'9')('0'..'9') ':' ('0'..'9')('0'..'9') ':' ('0'..'9')('0'..'9'))?;

fragment DIGIT: ('0'..'9');
INTEGER : DIGIT+ ;

DOUBLE : DIGIT+'.'DIGIT+ ;

TRUE : '#T' ; 

FALSE : '#F' ; 

WS : (' '|'\t'|'\r'|'\n') -> skip ;

BLOCK_COMMENT : ('%%' .*? '\r'? '\n')+; 
LINE_COMMENT : '%' .*? '\r'? '\n' ; 

AT : '@' ;

IMPLICATION : ':-' ;

// Operators  ------
GT : '>' ;
LT : '<' ;
GE : '>=' ;
LE : '<=' ;
EQ : '=' ;
IN : ' in ' ;
NOTIN : WS+ '!in' ;
NEQ : '!=' | '<>' ;
PLUS : '+' ;
MINUS : '-' ;
NOT : '!';
EQEQ : '==';
AND : '&&';
OR : '||';
PROD : '*' ;
DIV : '/' ;
UNION : '|';
INTERSECTION : '&' ;

// Other tokens ------

LBR : '(' ;
RBR : ')' ;
