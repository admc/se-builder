/*
* Copyright 2012 Sauce Labs
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*
* http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/

package com.sebuilder.interpreter;

import java.util.HashMap;
import java.util.Map;
import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.openqa.selenium.firefox.FirefoxDriver;

/**
 * A single run of a test script.
 * @author zarkonnen
 */
public class TestRun {
	HashMap<String, String> vars = new HashMap<String, String>();
	Script script;
	int stepIndex = -1;
	FirefoxDriver driver;
	Log log;

	public TestRun(Script script) {
		this.script = script;
		log = LogFactory.getFactory().getInstance(SeInterpreter.class);
	}
	
	public TestRun(Script script, Log log) {
		this.script = script;
		this.log = log;
	}
	
	/** @return True if there is another step to execute. */
	public boolean hasNext() {
		boolean hasNext = stepIndex < script.steps.size() - 1;
		if (!hasNext && driver != null) {
			log.debug("Closing FirefoxDriver.");
			driver.close();
		}
		return hasNext;
	}
	
	/**
	 * Executes the next step.
	 * @return True on success.
	 */
	public boolean next() {
		if (stepIndex == -1) {
			log.debug("Starting test run.");
		}
		if (driver == null) {
			log.debug("Initialising FirefoxDriver.");
			driver = new FirefoxDriver();
		}
		log.debug("Running step " + (stepIndex + 2) + ":" +
				script.steps.get(stepIndex + 1).getClass().getSimpleName() + " step.");
		return script.steps.get(++stepIndex).type.run(this);
	}
	
	/**
	 * Resets the script's progress and closes the driver if needed.
	 */
	public void reset() {
		log.debug("Resetting test run.");
		vars.clear();
		stepIndex = -1;
		if (driver != null) { driver.close(); }
	}
	
	/**
	 * Runs the entire (rest of the) script.
	 * @return Whether all steps succeeded.
	 */
	public boolean finish() {
		boolean success = true;
		while (hasNext()) { success = next() && success; }
		return success;
	}
	
	/** @return The step that is being/has just been executed. */
	public Script.Step currentStep() { return script.steps.get(stepIndex); }
	/** @return The driver instance being used. */
	public FirefoxDriver driver() { return driver; }
	
	/**
	 * Fetches a String parameter from the current step.
	 * @param paramName The parameter's name.
	 * @return The parameter's value.
	 */
	public String string(String paramName) {
		String s = currentStep().stringParams.get(paramName);
		if (s == null) {
			throw new RuntimeException("Missing parameter \"" + paramName + "\" at step #" +
					(stepIndex + 1) + ".");
		}
		// This kind of variable substitution makes for short code, but it's inefficient.
		for (Map.Entry<String, String> v : vars.entrySet()) {
			s = s.replace("${" + v.getKey() + "}", v.getValue());
		}
		return s;
	}
	
	/**
	 * Fetches a Locator parameter from the current step.
	 * @param paramName The parameter's name.
	 * @return The parameter's value.
	 */
	public Locator locator(String paramName) {
		Locator l = new Locator(currentStep().locatorParams.get(paramName));
		if (l == null) {
			throw new RuntimeException("Missing parameter \"" + paramName + "\" at step #" +
					(stepIndex + 1) + ".");
		}
		// This kind of variable substitution makes for short code, but it's inefficient.
		for (Map.Entry<String, String> v : vars.entrySet()) {
			l.value = l.value.replace("${" + v.getKey() + "}", v.getValue());
		}
		return l;
	}
}
