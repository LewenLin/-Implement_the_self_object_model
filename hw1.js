// hw1.js
// written in javascript
// Lewen Lin
// 09/13/2025

//basic function
function makeObj() { return { slots: {}, parents: new Set(), value: undefined, fn: undefined }; }
function primitive(v) { return { slots: {}, parents: new Set(), value: v, fn: undefined }; }
function primitiveFn(f) { return { slots: {}, parents: new Set(), value: undefined, fn: f }; }
function assignSlot(o, name, v) { o.slots[name] = v; }
function makeParent(o, name) { o.parents.add(name); }

//clone function
function clone(o) {
  const c = makeObj();
  c.value = o.value; c.fn = o.fn;
  for (const k in o.slots) c.slots[k] = o.slots[k];
  for (const p of o.parents) c.parents.add(p);
  return c;
}

// BFS search for a slot by name
function bfsLookup(o, name) {
  const seen = new Set(), q = [o];
  while (q.length) {
    const cur = q.shift();
    if (seen.has(cur)) continue;
    seen.add(cur);
    if (Object.prototype.hasOwnProperty.call(cur.slots, name)) return cur.slots[name];
    for (const p of cur.parents) {
      const parentObj = cur.slots[p];
      if (parentObj) q.push(parentObj);
    }
  }
  return null;
}

// Evaluate an object
function evaluate(o) {
  if (typeof o.fn === "function") return o.fn(o);   // fn objects need explicit parameter
  if (o.value !== undefined) return primitive(o.value);
  return o;
}

// Send message without parameter
function sendAMessage(receiver, msg) {
  const target = bfsLookup(receiver, msg);
  if (!target) throw new Error(`msg ${msg} not found`);
  return evaluate(clone(target));
}

// Send message with parameter (caller provides { self: ... } if needed)
function sendAMessageWithParameters(receiver, msg, paramObj) {
  const target = bfsLookup(receiver, msg);
  if (!target) throw new Error(`msg ${msg} not found`);
  const callee = clone(target);
  assignSlot(callee, "parameter", paramObj);
  return evaluate(callee);
}

// Boolean object, with "choose"
function makeBool(flag) {
  const b = primitive(!!flag);
  assignSlot(b, "choose", primitiveFn(selfObj => {
    const chooser = selfObj.slots.parameter;  // chooser has then/else
    return (b.value ? chooser.slots.then : chooser.slots.else);
  }));
  return b;
}

// Number object, methods need parameter.self
function makeNum(n) {
  const x = primitive(Number(n));
  assignSlot(x, "isZero", primitiveFn(selfObj => {
    const recv = selfObj.slots.parameter.slots.self;
    return primitive(recv.value === 0);
  }));
  assignSlot(x, "dec", primitiveFn(selfObj => {
    const recv = selfObj.slots.parameter.slots.self;
    return primitive(recv.value - 1);
  }));
  assignSlot(x, "value", primitiveFn(selfObj => {
    const recv = selfObj.slots.parameter.slots.self;
    return primitive(recv.value);
  }));
  return x;
}

// Helper: build a parameter object with self
function paramWithSelf(obj) {
  const p = makeObj();
  assignSlot(p, "self", obj);
  return p;
}


if (require.main === module) {
  console.log("== if-then-else ==");
  const t = makeBool(true), f = makeBool(false);
  const chooser = makeObj();
  assignSlot(chooser, "then", primitive("YES"));
  assignSlot(chooser, "else", primitive("NO"));
  console.log("true.choose =", sendAMessageWithParameters(t, "choose", chooser).value);
  console.log("false.choose =", sendAMessageWithParameters(f, "choose", chooser).value);

  console.log("\n== factorial ==");

  const fact = makeObj();
  assignSlot(fact, "compute", primitiveFn(selfObj => {
    const n = selfObj.slots.parameter; 
    if (sendAMessageWithParameters(n, "isZero", paramWithSelf(n)).value) {
      return primitive(1);
    } else {
      const decVal = sendAMessageWithParameters(n, "dec", paramWithSelf(n));
      const nVal = sendAMessageWithParameters(n, "value", paramWithSelf(n));

      // recursive call with decVal wrapped as number
      const recEnv = primitiveFn(fact.slots.compute.fn);
      assignSlot(recEnv, "parameter", makeNum(decVal.value));
      const rec = evaluate(recEnv).value;

      return primitive(nVal.value * rec);
    }
  }));

  for (let i = 0; i <= 6; i++) {
    const n = makeNum(i);
    const call = primitiveFn(fact.slots.compute.fn);
    assignSlot(call, "parameter", n);
    const res = evaluate(call);
    console.log(`fact(${i}) =`, res.value);
  }
}
