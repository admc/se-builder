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

/**
 * Abstract class for classes that define how to run a step of a particular type. Implementing
 * classes should be located in com.sebuilder.interpreter.steptype.
 * @author zarkonnen
 */
public abstract class StepType {
	/**
	 * Perform the action this step consists of.
	 * @param ctx Current test run.
	 * @return Whether the step succeeded. This should be true except for failed verify steps, which
	 *         should return false. Other failures should throw a RuntimeException.
	 */
	public abstract boolean run(TestRun ctx);
	
	/**
	 * Mapping of the names of step types to their implementing classes, lazily loaded through
	 * reflection. StepType classes must be in the com.sebuilder.interpreter.steptype package and
	 * their name must be the capitalized name of their type. For example, the class for "get" is at
	 * com.sebuilder.interpreter.steptype.Get.
	 */
	private static final HashMap<String, StepType> typesMap = new HashMap<String, StepType>();
	
	public static StepType ofName(String name) {
		try {
			if (!typesMap.containsKey(name)) {
				String className = name.substring(0, 1).toUpperCase() + name.substring(1);
				try {
					Class c = Class.forName("com.sebuilder.interpreter.steptype." + className);
					try {
						typesMap.put(name, (StepType) c.newInstance());
					} catch (InstantiationException ie) {
						throw new RuntimeException(c.getName() + " could not be instantiated.", ie);
					} catch (IllegalAccessException iae) {
						throw new RuntimeException(c.getName() + " could not be instantiated.", iae);
					} catch (ClassCastException cce) {
						throw new RuntimeException(c.getName() + " does not extend StepType.", cce);
					}
				} catch (ClassNotFoundException cnfe) {
					throw new RuntimeException("No implementation class for step type \"" + name + "\" could be found.", cnfe);
				}
			}

			return typesMap.get(name);
		} catch (Exception e) {
			throw new RuntimeException("Step type \"" + name + "\" is not implemented.", e);
		}
	}
}
