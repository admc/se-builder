package com.sebuilder.interpreter;

import java.util.ArrayList;
import java.util.HashMap;

public class Script {
	ArrayList<Step> steps = new ArrayList<Step>();
	
	public TestRun start() { return new TestRun(this); }
	public boolean run() { return start().finish(); }
	
	public static class Step {
		Type type;
		HashMap<String, String> stringParams = new HashMap<String, String>();
		HashMap<String, Locator> locatorParams = new HashMap<String, Locator>();
	}
}
