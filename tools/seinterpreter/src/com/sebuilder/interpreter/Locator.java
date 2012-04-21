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

/**
 * A Selenium locator.
 * @author zarkonnen
 */
public class Locator {
	public Type type;
	public String value;

	public Locator(Type type, String value) {
		this.type = type;
		this.value = value;
	}
	
	public Locator(String type, String value) {
		this.type = Type.ofName(type);
		this.value = value;
	}

	public Locator(Locator l) {
		type = l.type;
		value = l.value;
	}
	
	public enum Type {
		ID,
		NAME,
		LINK_TEXT,
		CSS_SELECTOR,
		XPATH;
		
		public static Type ofName(String name) {
			return Type.valueOf(name.toUpperCase().replace(" ", "_"));
		}
	}
}
