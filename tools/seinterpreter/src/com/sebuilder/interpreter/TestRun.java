package com.sebuilder.interpreter;

import java.util.HashMap;
import java.util.Map;

public class TestRun {
	HashMap<String, String> vars = new HashMap<String, String>();
	Script script;
	int stepIndex = -1;

	public TestRun(Script script) {
		this.script = script;
	}
	
	public boolean hasNext() {
		return stepIndex < vars.size() - 1;
	}
	
	public boolean next() {
		return script.steps.get(++stepIndex).type.run(this);
	}
	
	public boolean finish() {
		boolean success = true;
		while (hasNext()) { success = next() && success; }
		return success;
	}
	
	public Script.Step currentStep() { return script.steps.get(stepIndex); }
	
	public String string(String name) {
		String s = currentStep().stringParams.get(name);
		// This kind of variable substitution makes for short code, but it's inefficient.
		for (Map.Entry<String, String> v : vars.entrySet()) {
			s = s.replace("${" + v.getKey() + "}", v.getValue());
		}
		return s;
	}
	
	public Locator locator(String name) {
		Locator l = new Locator(currentStep().locatorParams.get(name));
		// This kind of variable substitution makes for short code, but it's inefficient.
		for (Map.Entry<String, String> v : vars.entrySet()) {
			l.value = l.value.replace("${" + v.getKey() + "}", v.getValue());
		}
		return l;
	}
}
