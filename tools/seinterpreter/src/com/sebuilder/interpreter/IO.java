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

import java.io.IOException;
import java.io.Reader;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import org.json.JSONTokener;

/**
 * Code for reading scripts.
 * @author zarkonnen
 */
public class IO {
	/**
	 * @param r A Reader pointing to a JSON stream describing a script.
	 * @return A script, ready to run.
	 * @throws IOException If anything goes wrong with interpreting the JSON, or with the Reader.
	 * @throws JSONException If the JSON can't be parsed.
	 */
	public static Script read(Reader r) throws IOException, JSONException {
		return parse(new JSONObject(new JSONTokener(r)));
	}
	
	/**
	 * @param scriptO A JSONObject describing a script.
	 * @return A script, ready to run.
	 * @throws IOException If anything goes wrong with interpreting the JSON.
	 */
	public static Script parse(JSONObject scriptO) throws IOException {
		try {
			if (!scriptO.get("seleniumVersion").equals("2")) {
				throw new IOException("Unsupported Selenium version: \"" + scriptO.get("seleniumVersion") + "\".");
			}
			if (scriptO.getInt("formatVersion") != 1) {
				throw new IOException("Unsupported Selenium script format version: \"" + scriptO.get("formatVersion") + "\".");
			}
			Script script = new Script();
			JSONArray stepsA = scriptO.getJSONArray("steps");
			for (int i = 0; i < stepsA.length(); i++) {
				JSONObject stepO = stepsA.getJSONObject(i);
				Script.Step step = new Script.Step(StepType.ofName(stepO.getString("type")));
				script.steps.add(step);
				JSONArray keysA = stepO.names();
				for (int j = 0; j < keysA.length(); j++) {
					String key = keysA.getString(j);
					if (key.equals("type")) { continue; }
					if (stepO.optJSONObject(key) != null) {
						step.locatorParams.put(key, new Locator(
								stepO.getJSONObject(key).getString("type"),
								stepO.getJSONObject(key).getString("value")
						));
					} else {
						step.stringParams.put(key, stepO.getString(key));
					}
				}
			}
			return script;
		} catch (Exception e) {
			throw new IOException("Could not parse script.", e);
		}
	}
}
