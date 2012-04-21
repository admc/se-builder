/*
 * An interpreter for Builder JSON tests. Given a JSON script file, it plays it back using the Java
 * WebDriver bindings.
 */
package com.sebuilder.interpreter;

import java.util.Map;
import java.io.FileReader;
import java.io.BufferedReader;
import java.util.HashMap;
import java.io.FileNotFoundException;
import org.json.JSONException;
import org.json.JSONObject;
import org.json.JSONTokener;
import java.util.concurrent.TimeUnit;
import java.util.Date;
import java.io.File;
import org.json.JSONArray;
import org.openqa.selenium.support.ui.Select;
import org.openqa.selenium.interactions.Actions;
import org.openqa.selenium.firefox.FirefoxDriver;
import org.openqa.selenium.*;
import static org.openqa.selenium.OutputType.*;

public class SeInterpreter {
	public static void main(String[] args) throws JSONException, FileNotFoundException {
		File f = new File(args[0]);
		JSONObject jo = new JSONObject(new JSONTokener(new BufferedReader(new FileReader(f))));
		FirefoxDriver wd = new FirefoxDriver();
        wd.manage().timeouts().implicitlyWait(60, TimeUnit.SECONDS);
		JSONArray steps = jo.getJSONArray("steps");
		HashMap<String, String> vars = new HashMap<String, String>();
		for (int i = 0; i < steps.length(); i++) {
			JSONObject step = steps.getJSONObject(i);
			String type = step.getString("type");
			if (type.equals("get")) {
				wd.get(step.getString("url"));
			}
			if (type.equals("storeTitle")) {
				vars.put(step.getString("variable"), wd.getTitle());
			}
			if (type.equals("verifyTitle")) {
				String cmp = step.getString("title");
				for (Map.Entry<String, String> v : vars.entrySet()) {
					cmp = cmp.replace("${" + v.getKey() + "}", v.getValue());
				}
				if (wd.getTitle().equals(cmp)) {
					System.out.println("verifyTitle succeeded");
				} else {
					wd.close();
					throw new RuntimeException("verifyTitle failed");
				}
			}
		}
		wd.close();
	}	
}
