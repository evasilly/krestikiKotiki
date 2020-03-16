using Microsoft.Owin;
using Owin;

[assembly: OwinStartupAttribute(typeof(popytka102.Startup))]
namespace popytka102
{
    public partial class Startup
    {
        public void Configuration(IAppBuilder app)
        {
            ConfigureAuth(app);
        }
    }
}
