package driver_service

import (
	"log"
	"scylla-server/prisma"
	"scylla-server/prisma/db"
)


// Get all the drivers, or return nil and the error
func GetAllDrivers() ([]db.DriverModel, error) {
	client, ctx := prisma.PrismaClient()

	drivers, err := client.Driver.FindMany().Exec(ctx)
	if err != nil {
		log.Printf("Err %q\n", err.Error())
		return nil, err
	}

	return drivers, nil

}

func UpsertDriver() () {
	client, ctx := prisma.PrismaClient()
	
	driver, err := client.Driver.Ba
}

//   /**
//    * CRUD operation to create a driver in the database if it doesn't already exist, does nothing otherwise.
//    * @param driverName name of the driver as string
//    * @param runId id of the run that the driver is currently associated with
//    * @returns the created driver
//    */
//   static upsertDriver = async (driverName: string, runId: number): Promise<driver> => {
//     const driver = await prisma.driver.upsert({
//       where: {
//         username: driverName
//       },
//       update: {},
//       create: {
//         username: driverName
//       }
//     });

//     await RunService.getRunById(runId);

//     await prisma.run.update({
//       where: {
//         id: runId
//       },
//       data: {
//         driver: {
//           connect: {
//             username: driverName
//           }
//         }
//       }
//     });

//     return driver;
//   };
// }