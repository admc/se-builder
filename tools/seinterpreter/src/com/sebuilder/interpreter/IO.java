package com.sebuilder.interpreter;

import java.io.Reader;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import org.json.JSONTokener;

public class IO {
	public static Script read(Reader r) throws JSONException {
		JSONObject so = new JSONObject(new JSONTokener(r));
		Script s = new Script();
		JSONArray ja = so.getJSONArray("steps");
		for (int i = 0; i < ja.length(); i++) {
			
		}
		return s;
	}
}
