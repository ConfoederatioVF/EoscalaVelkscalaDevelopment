//Initialise functions
{
	//averageLUH2Rasters() - Averages out all stocks in LUH2 rasters and outputs them to an anthropogenic_mean folder.
	global.averageLUH2Rasters = function () {
		//Declare local instance variables
		var hyde_years = config.velkscala.hyde.hyde_years;
		var luh2_config = config.velkscala.luh2;

		//Iterate over all hyde_years
		for (var i = luh2_config.luh2_domain[0]; i <= luh2_config.luh2_domain[1]; i++)
			if (hyde_years.includes(i)) try {
				var luh2_images = {};
				var luh2_stocks = config.velkscala.luh2.variables;
				var output_file_path = `${luh2_config.output_folder}/${luh2_config.file_prefix}${i}.png`;

				log.info(`Generating LUH2 raster for ${getHYDEYearName(i)} ..`);

				for (var x = 0; x < luh2_stocks.length; x++) try {
					var local_file_path = `${luh2_config.input_folder}${luh2_stocks[x]}/output_folder/${luh2_config.file_prefix}${luh2_stocks[x]}_${i}.png`;

					log.info(`- Loading ${local_file_path} ..`);
					luh2_images[luh2_stocks[x]] = loadNumberRasterImage(local_file_path, {
						type: "greyscale"
					});
				} catch (e) {
					log.warn(`- Failed to load ${luh2_stocks[x]} into memory for ${i}.`);
				}

				log.info(`- Averaging LUH2 raster for ${i} ..`);
				saveNumberRasterImage({
					file_path: output_file_path,
					type: "greyscale",

					height: luh2_images[luh2_stocks[0]].height,
					width: luh2_images[luh2_stocks[0]].width,
					function: function (arg0_index) {
						//Convert from parameters
						var index = arg0_index;

						//Declare local instance variables
						var local_sum = 0;

						//Average all luh2_images
						for (var x = 0; x < luh2_stocks.length; x++) {
							var local_value = luh2_images[luh2_stocks[x]].data[index];

							local_sum += local_value;
						}

						//Return statement
						return local_sum/luh2_stocks.length;
					}
				});

				log.info(`- File written to ${output_file_path}.`);
			} catch (e) { console.error(e); }
	};
	
	//convertKK10_LUH2RastersToGeoPNG() - Converts greyscale KK10_LUH2 rasters to RGBA GeoPNG rasters based on average world population estimates.
	global.convertKK10_LUH2RastersToGeoPNG = function () {
		//Declare local instance variables
		var common_defines = config.defines.common;
		var hyde_years = config.velkscala.hyde.hyde_years;
		var world_pop_obj = getWorldPopulationObject();
		
		//Iterate over all hyde_years and check if the corresponding raster file exists
		for (let i = 0; i < hyde_years.length; i++) {
			var greyscale_file_path = `${common_defines.input_file_paths.kk10luh2_folder}/${common_defines.input_file_paths.kk10luh2_prefix}${hyde_years[i]}.png`;
			var output_file_path = `${common_defines.input_file_paths.kk10luh2_geopng_folder}/${common_defines.input_file_paths.kk10luh2_prefix}${hyde_years[i]}.png`;
			
			if (fs.existsSync(greyscale_file_path)) {
				var greyscale_image = loadImage(greyscale_file_path);
				var greyscale_sum = 0;
				var local_world_population = world_pop_obj[hyde_years[i]];
				
				//Iterate over all pixels in greyscale_image
				for (let x = 0; x < greyscale_image.width; x++)
					for (let y = 0; y < greyscale_image.height; y++) {
						var local_index = (greyscale_image.width*y + x) << 2; //4 bytes per pixel (RGBA)
						var r = greyscale_image.data[local_index];
						
						greyscale_sum += r/255;
					}
				
				var population_per_pixel = local_world_population/greyscale_sum;
				
				//Save number raster image
				log.info(`- Converting KK10_LUH2 from greyscale to GeoPNG for ${hyde_years[i]} ..`);
				saveNumberRasterImage({
					file_path: output_file_path,
					height: greyscale_image.height,
					width: greyscale_image.width,
					
					function: function (arg0_index) {
						//Convert from parameters
						var local_index = arg0_index*4; //Index must be multiplied by 4 since we are using loadImage(), and not loadNumberRasterImage()
						
						//Return statement
						return (greyscale_image.data[local_index]/255)*population_per_pixel;
					}
				});
			} else {
				//Simply copy over the original Velkscala raster otherwise
				var velkscala_image_path = `${common_defines.output_file_paths.hyde_folder}/popc_${getHYDEYearName(hyde_years[i])}_number.png`;
				
				log.info(`- Copying HYDE-McEvedy for GeoPNG for ${hyde_years[i]} ..`);
				fs.copyFileSync(velkscala_image_path, output_file_path);
			}
		}
	};

	//generateKK10_LUH2Rasters() - Generates average rasters for both KK10 and LUH2 up to the limit of their respective domains over all HYDE years.
	global.generateKK10_LUH2Rasters = function () {
		//Declare local instance variables
		var common_defines = config.defines.common;
		var hyde_years = config.velkscala.hyde.hyde_years;
		var kk10_config = config.velkscala.kk10;
		var luh2_config = config.velkscala.luh2;

		//Iterate over all hyde_years
		for (var i = 0; i < hyde_years.length; i++) try {
			var in_luh2_domain = (hyde_years[i] >= luh2_config.luh2_domain[0] && hyde_years[i] <= luh2_config.luh2_domain[1]);
			var in_kk10_domain = (hyde_years[i] >= kk10_config.kk10_domain[0] && hyde_years[i] <= kk10_config.kk10_domain[1]);
			var output_file_path = `${common_defines.input_file_paths.kk10luh2_folder}/${common_defines.input_file_paths.kk10luh2_prefix}${hyde_years[i]}.png`;

			if (in_luh2_domain || in_kk10_domain) {
				//1. If this is an intersection of both the luh2_domain and kk10_domain; average rasters
				var luh2_file_path = `${luh2_config.output_folder}/${luh2_config.file_prefix}${hyde_years[i]}.png`;
				var kk10_file_path = `${kk10_config.input_folder}/${kk10_config.file_prefix}${hyde_years[i]}.png`;

				if (in_luh2_domain && in_kk10_domain) {
					var luh2_image = loadNumberRasterImage(luh2_file_path, { type: "greyscale" });
					var kk10_image = loadNumberRasterImage(kk10_file_path, { type: "greyscale" });

					log.info(`- Averaging KK10 and LUH2 for ${hyde_years[i]} ..`);
					saveNumberRasterImage({
						file_path: output_file_path,
						type: "greyscale",

						height: luh2_image.height,
						width: luh2_image.width,
						function: function (arg0_index) {
							//Convert from parameters
							var index = arg0_index;

							//Return statement
							return (kk10_image.data[index] + luh2_image.data[index])/2;
						}
					});

					log.info(`- File written to ${output_file_path}.`);
					continue;
				}

				//2. If this is of only the kk10_domain; merely copy the kk10 raster to its destination
				if (in_kk10_domain && !in_luh2_domain) {
					fs.copyFileSync(kk10_file_path, output_file_path);
					continue;
				}

				//3. If this is of only the luh2_domain; merely copy the luh2 raster to its destination
				if (in_luh2_domain && !in_kk10_domain) {
					fs.copyFileSync(luh2_file_path, output_file_path);
					continue;
				}
			}
		} catch (e) { console.error(e); }
	};
	
	global.processKK10_LUH2Rasters = function () {
		generateKK10_LUH2Rasters(); //1. Average greyscales from KK10/LUH2 climate models
		convertKK10_LUH2RastersToGeoPNG(); //2. Convert greyscale images to GeoPNGs based on global population estimates
		scaleKK10_LUH2RastersToRegional(); //3. Scale to Nelson/OWID regional estimates
		scaleKK10_LUH2RastersToGlobal(); //4. Recalibrate to global population estimates
	};

	global.scaleKK10_LUH2RastersToGlobal = function () {
		//Declare local instance variables
		var common_defines = config.defines.common;
		var hyde_years = config.velkscala.hyde.hyde_years;
		var world_pop_obj = getWorldPopulationObject();
		
		//Iterate over all hyde_years and scale the corresponding raster to the global mean
		for (let i = 0; i < hyde_years.length; i++) {
			var local_kk10luh2_file_path = `${common_defines.input_file_paths.kk10luh2_owid_folder}/${common_defines.input_file_paths.kk10luh2_prefix}owid_${hyde_years[i]}.png`;
			var local_output_path = `${common_defines.input_file_paths.kk10luh2_processed_folder}/${common_defines.input_file_paths.kk10luh2_prefix}processed_${hyde_years[i]}.png`;
			var local_world_population = world_pop_obj[hyde_years[i]];
			
			if (fs.existsSync(local_kk10luh2_file_path)) {
				//Fetch current image sum
				var local_kk10luh2_sum = getImageSum(local_kk10luh2_file_path);
				var local_scalar = local_world_population/local_kk10luh2_sum;
				
				//Multiply raster by local_scalar and output it
				log.info(`- Multiplying KK10_LUH2 Raster for ${hyde_years[i]} ..`);
				
				var local_kk10luh2_image = loadNumberRasterImage(local_kk10luh2_file_path);
				saveNumberRasterImage({
					file_path: local_output_path,
					height: 2160,
					width: 4320,
					
					function: function (arg0_index) {
						//Convert from parameters
						var local_index = arg0_index;
						
						//Return statement
						return Math.round(local_kk10luh2_image.data[local_index]*local_scalar);
					}
				});
			}
		}
	};

	global.scaleKK10_LUH2RastersToRegional = function (arg0_options) {
		//Convert from parameters
		var options = (arg0_options) ? arg0_options : {};
		
		//Initialise options
		if (!options.process_datasets) options.process_datasets = ["nelson", "owid"];
		
		//Declare local instance variables
		var common_defines = config.defines.common;
		var hyde_years = config.velkscala.hyde.hyde_years;
		var nelson_obj = getNelsonPopulationObject();
		var owid_obj = getOWIDRegionsObject();
		
		//Load in nelson_raster, owid_raster for reference
		var all_nelson_regions = Object.keys(nelson_obj.regions);
		var nelson_raster = loadImage(common_defines.input_file_paths.nelson_subdivisions);
		var owid_raster = loadImage(common_defines.input_file_paths.owid_subdivisions);
		var all_owid_regions = Object.keys(owid_obj);
		
		//1. Scale rasters to Nelson first; if transparent, set value to zero
		if (options.process_datasets.includes("nelson"))
			for (let i = 0; i < hyde_years.length; i++) {
			var local_input_file_path = `${common_defines.input_file_paths.kk10luh2_geopng_folder}/${common_defines.input_file_paths.kk10luh2_prefix}${hyde_years[i]}.png`;
			var local_input_raster = loadNumberRasterImage(local_input_file_path);
			var local_output_file_path = `${common_defines.input_file_paths.kk10luh2_nelson_folder}/${common_defines.input_file_paths.kk10luh2_prefix}nelson_${hyde_years[i]}.png`;
			
			//Adjust raster image to Nelson
			log.info(`- Standardising to Nelson for ${hyde_years[i]} ..`);
			if (fs.existsSync(local_input_file_path)) {
				var local_nelson_obj = {};
				var local_nelson_scalars = {};
				
				//Populate local_nelson_obj
				console.log(local_input_file_path);
				operateNumberRasterImage({
					file_path: local_input_file_path,
					function: function (arg0_index, arg1_number) {
						//Convert from parameters
						var index = arg0_index;
						var number = arg1_number;
						
						//Declare local instance variables;
						var local_colour_key = [
							nelson_raster.data[index],
							nelson_raster.data[index + 1],
							nelson_raster.data[index + 2]
						].join(",");
						var local_region = nelson_obj.regions[local_colour_key];
						
						if (local_region) modifyValue(local_nelson_obj, local_colour_key, number);
					}
				});
				
				//Iterate over all_nelson_regions; populate local_nelson_scalars
				for (let x = 0; x < all_nelson_regions.length; x++) {
					var local_region = nelson_obj.regions[all_nelson_regions[x]];
					
					//console.log(nelson_obj.regions, all_nelson_regions[x], local_region);
					var local_population = local_region.population[hyde_years[i]];
					var local_value = local_nelson_obj[local_region.colour.join(",")];
					
					local_nelson_scalars[local_region.colour.join(",")] = returnSafeNumber(local_population/local_value, 1); //Set to 1 for safety if out of domain
				}
				
				log.info(` - Local Nelson object:`, local_nelson_obj);
				log.info(` - Local Nelson scalars:`, local_nelson_scalars);
				
				let sanity_checks = 0;
				saveNumberRasterImage({
					file_path: local_output_file_path,
					height: nelson_raster.height,
					width: nelson_raster.width,
					function: function (arg0_index) {
						//Convert from parameters
						var index = arg0_index;
						
						//Declare local instance variables
						var byte_index = index*4;
						var local_colour_key = [
							nelson_raster.data[byte_index],
							nelson_raster.data[byte_index + 1],
							nelson_raster.data[byte_index + 2]
						].join(",");
						var local_region = nelson_obj.regions[local_colour_key];
						var local_value = local_input_raster.data[index];
						
						//Adjust to Nelson if possible
						if (local_region) {
							local_value *= local_nelson_scalars[local_colour_key];
							sanity_checks++;
						} else {
							local_value = 0;
						}
						
						//Return statement
						return local_value;
					}
				});
				
				log.info(` - Sanity checks: ${parseNumber(sanity_checks)}`);
			}
		}

		//2. Scale rasters to OWID/HYDE second
		if (options.process_datasets.includes("owid"))
			for (let i = 0; i < hyde_years.length; i++) {
				var local_input_file_path = `${common_defines.input_file_paths.kk10luh2_nelson_folder}/${common_defines.input_file_paths.kk10luh2_prefix}nelson_${hyde_years[i]}.png`;
				var local_input_raster = loadNumberRasterImage(local_input_file_path);
				var local_output_file_path = `${common_defines.input_file_paths.kk10luh2_owid_folder}/${common_defines.input_file_paths.kk10luh2_prefix}owid_${hyde_years[i]}.png`;
				
				//Adjust raster image to OWID/HYDE
				log.info(`- Standardising to OWID/HYDE for ${hyde_years[i]} ..`);
				if (fs.existsSync(local_input_file_path)) {
					var local_owid_obj = {};
					var local_owid_scalars = {};
					
					//Populste local_owid_obj
					operateNumberRasterImage({
						file_path: local_input_file_path,
						function: function (arg0_index, arg1_number) {
							//Convert from parameters
							var index = arg0_index;
							var number = arg1_number;
							
							//Declare local instance variables
							var local_colour_key = [
								owid_raster.data[index],
								owid_raster.data[index + 1],
								owid_raster.data[index + 2]
							].join(",");
							var local_region = owid_obj[local_colour_key];
							
							if (local_region) modifyValue(local_owid_obj, local_colour_key, number);
						}
					});
					
					//Iterate over all_owid_regions, populate local_owid_scalars
					for (let x = 0; x < all_owid_regions.length; x++) {
						var local_region = owid_obj[all_owid_regions[x]];
						var local_population = returnSafeNumber(local_region.population[hyde_years[i]], 1);
						var local_value = local_owid_obj[all_owid_regions[x]];
						
						local_owid_scalars[local_region.colour.join(",")] = returnSafeNumber(local_population/local_value, 1);
					}
					
					log.info(` - Local OWID object:`, local_owid_obj);
					log.info(` - Local OWID scalars:`, local_owid_scalars); //Something happens to make scalars infinitesimal by 300AD
					
					saveNumberRasterImage({
						file_path: local_output_file_path,
						height: owid_raster.height,
						width: owid_raster.width,
						
						function: function (arg0_index) {
							//Convert from parameters
							var index = arg0_index;
							
							//Declare local instance variables
							var byte_index = index*4;
							var local_colour_key = [
								owid_raster.data[byte_index],
								owid_raster.data[byte_index + 1],
								owid_raster.data[byte_index + 2]
							].join(",");
							var local_region = owid_obj[local_colour_key];
							var local_value = local_input_raster.data[index];
							
							//Adjust to OWID if possible
							if (local_region) {
								local_value *= local_owid_scalars[local_colour_key];
							} else {
								local_value = 0;
							}
							
							//Return statement
							return local_value;
						}
					});
				}
			}
	};
}