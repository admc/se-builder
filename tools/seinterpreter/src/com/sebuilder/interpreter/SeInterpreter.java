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

import java.io.BufferedReader;
import java.io.File;
import java.io.FileInputStream;
import java.io.InputStreamReader;
import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;

/**
 * An interpreter for Builder JSON tests. Given a JSON script file, it plays it back using the Java
 * WebDriver bindings.
 * @author zarkonnen
 */
public class SeInterpreter {
	public static void main(String[] args) {
		if (args.length == 0) {
			System.out.println("Usage: Specify one or more paths to Selenium 2 JSON files to run them.");
			System.exit(0);
		}
		
		Log log = LogFactory.getFactory().getInstance(SeInterpreter.class);
		try {
			for (String s : args) {
				File f = new File(s);
				if (!f.exists() || f.isDirectory()) {
					throw new RuntimeException("The file " + f + " does not exist!");
				}
				BufferedReader br = null;
				try {
					Script script = IO.read(br = new BufferedReader(new InputStreamReader(new FileInputStream(f), "UTF-8")));
					if (script.run()) {
						log.info(s + " succeeded");
					} else {
						log.info(s + " failed");
					}
				} finally {
					if (br != null) { br.close(); }
				}
			}
		} catch (Exception e) {
			log.fatal("Run error.", e);
		}
	}	
}
