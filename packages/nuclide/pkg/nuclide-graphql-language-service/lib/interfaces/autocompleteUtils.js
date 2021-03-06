'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getDefinitionState = getDefinitionState;
exports.getFieldDef = getFieldDef;
exports.forEachState = forEachState;
exports.objectValues = objectValues;
exports.hintList = hintList;

var _graphql;

function _load_graphql() {
  return _graphql = require('graphql');
}

var _introspection;

function _load_introspection() {
  return _introspection = require('graphql/type/introspection');
}

// Utility for returning the state representing the Definition this token state
// is within, if any.
function getDefinitionState(tokenState) {
  let definitionState;

  forEachState(tokenState, state => {
    switch (state.kind) {
      case 'Query':
      case 'ShortQuery':
      case 'Mutation':
      case 'Subscription':
      case 'FragmentDefinition':
        definitionState = state;
        break;
    }
  });

  return definitionState;
}

// Gets the field definition given a type and field name
/**
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 *
 * 
 */

function getFieldDef(schema, type, fieldName) {
  if (fieldName === (_introspection || _load_introspection()).SchemaMetaFieldDef.name && schema.getQueryType() === type) {
    return (_introspection || _load_introspection()).SchemaMetaFieldDef;
  }
  if (fieldName === (_introspection || _load_introspection()).TypeMetaFieldDef.name && schema.getQueryType() === type) {
    return (_introspection || _load_introspection()).TypeMetaFieldDef;
  }
  if (fieldName === (_introspection || _load_introspection()).TypeNameMetaFieldDef.name && (0, (_graphql || _load_graphql()).isCompositeType)(type)) {
    return (_introspection || _load_introspection()).TypeNameMetaFieldDef;
  }
  if (type.getFields) {
    return type.getFields()[fieldName];
  }

  return null;
}

// Utility for iterating through a CodeMirror parse state stack bottom-up.
function forEachState(stack, fn) {
  const reverseStateStack = [];
  let state = stack;
  while (state && state.kind) {
    reverseStateStack.push(state);
    state = state.prevState;
  }
  for (let i = reverseStateStack.length - 1; i >= 0; i--) {
    fn(reverseStateStack[i]);
  }
}

function objectValues(object) {
  const keys = Object.keys(object);
  const len = keys.length;
  const values = new Array(len);
  for (let i = 0; i < len; ++i) {
    values[i] = object[keys[i]];
  }
  return values;
}

// Create the expected hint response given a possible list and a token
function hintList(cursor, token, list) {
  return filterAndSortList(list, normalizeText(token.string));
}

// Given a list of hint entries and currently typed text, sort and filter to
// provide a concise list.
function filterAndSortList(list, text) {
  if (!text) {
    return filterNonEmpty(list, entry => !entry.isDeprecated);
  }

  const byProximity = list.map(entry => ({
    proximity: getProximity(normalizeText(entry.text), text),
    entry
  }));

  const conciseMatches = filterNonEmpty(filterNonEmpty(byProximity, pair => pair.proximity <= 2), pair => !pair.entry.isDeprecated);

  const sortedMatches = conciseMatches.sort((a, b) => (a.entry.isDeprecated ? 1 : 0) - (b.entry.isDeprecated ? 1 : 0) || a.proximity - b.proximity || a.entry.text.length - b.entry.text.length);

  return sortedMatches.map(pair => pair.entry);
}

// Filters the array by the predicate, unless it results in an empty array,
// in which case return the original array.
function filterNonEmpty(array, predicate) {
  const filtered = array.filter(predicate);
  return filtered.length === 0 ? array : filtered;
}

function normalizeText(text) {
  return text.toLowerCase().replace(/\W/g, '');
}

// Determine a numeric proximity for a suggestion based on current text.
function getProximity(suggestion, text) {
  // start with lexical distance
  let proximity = lexicalDistance(text, suggestion);
  if (suggestion.length > text.length) {
    // do not penalize long suggestions.
    proximity -= suggestion.length - text.length - 1;
    // penalize suggestions not starting with this phrase
    proximity += suggestion.indexOf(text) === 0 ? 0 : 0.5;
  }
  return proximity;
}

/**
 * Computes the lexical distance between strings A and B.
 *
 * The "distance" between two strings is given by counting the minimum number
 * of edits needed to transform string A into string B. An edit can be an
 * insertion, deletion, or substitution of a single character, or a swap of two
 * adjacent characters.
 *
 * This distance can be useful for detecting typos in input or sorting
 *
 * @param {string} a
 * @param {string} b
 * @return {int} distance in number of edits
 */
function lexicalDistance(a, b) {
  let i;
  let j;
  const d = [];
  const aLength = a.length;
  const bLength = b.length;

  for (i = 0; i <= aLength; i++) {
    d[i] = [i];
  }

  for (j = 1; j <= bLength; j++) {
    d[0][j] = j;
  }

  for (i = 1; i <= aLength; i++) {
    for (j = 1; j <= bLength; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;

      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);

      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + cost);
      }
    }
  }

  return d[aLength][bLength];
}