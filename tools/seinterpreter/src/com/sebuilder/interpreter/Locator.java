package com.sebuilder.interpreter;

public class Locator {
	public Type type;
	public String value;

	public Locator(Type type, String value) {
		this.type = type;
		this.value = value;
	}

	Locator(Locator get) {
		type = get.type;
		value = get.value;
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
