import { element } from "protractor";
import { Component, OnInit } from "@angular/core";
import { RemoteApiService } from "../remoteapi.service";
import { Peli } from "../listapelis/peli";
import { Constantes } from "../constantes";
import {
  LoadingController,
  AlertController,
  ToastController,
  IonItemSliding,
  IonTextarea,
  PopoverController,
  NavController,
  Platform
} from "@ionic/angular";
import { Login } from "../login/login";
import { HttpErrorResponse, HttpResponse } from "@angular/common/http";
import { Comentario } from "./comentario";
import { NuevoComentarioRequest } from "./nuevo-comentario-request";
import { NuevoComentarioResponse } from "./nuevo-comentario-response";

@Component({
  selector: "app-comentarios",
  templateUrl: "./comentarios.page.html",
  styleUrls: ["./comentarios.page.scss"],
  providers: [RemoteApiService]
})
export class ComentariosPage implements OnInit {
  peli: Peli;
  login: Login;
  esperando: boolean;
  elementoEspera: HTMLIonLoadingElement;
  lista_comentarios: Array<Comentario>;
  enEdicion: boolean;
  nuevaOpinion: string;

  constructor(
    public platform: Platform,
    public servicio_remoto: RemoteApiService,
    public lc: LoadingController,
    public ac: AlertController,
    public tc: ToastController,
    public nc: NavController,
    public toastController: ToastController
  ) {
    let peli_json: string = window.sessionStorage.getItem(
      Constantes.CLAVE_PELIS
    );
    this.peli = JSON.parse(peli_json);
    console.log("cargando comentarios de ..." + peli_json);

    let crendeciales: string = window.localStorage.getItem(
      Constantes.CLAVE_CREDENCIALES
    );
    this.login = JSON.parse(crendeciales);
    console.log("crendeciales ..." + crendeciales);
    this.enEdicion = false;
  }

  ngOnInit() {
    this.mostrarTodosLosComentarios();
  }

  public mostrarTodosLosComentarios() {
    console.log("obteniendo comentarios ...");
    this.mostrarEspera("Obteniendo comentarios");
    this.servicio_remoto
      .getComentariosPeli(this.login.token, this.peli.idfoto)
      .subscribe(
        resp_ok => {
          let respuesta_http: HttpResponse<Array<
            Comentario
          >> = resp_ok as HttpResponse<Array<Comentario>>;
          if (respuesta_http.status == 200) {
            this.lista_comentarios = respuesta_http.body;
            this.lista_comentarios.map(comentario =>
              console.log(
                comentario.texto +
                  " " +
                  comentario.id +
                  " " +
                  comentario.autor +
                  " " +
                  comentario.momento
              )
            );
          } else if (respuesta_http.status == 204) {
            this.informarPeliSinComentarios();
          }
          this.ocultarEspera();
        },
        resp_ko => {
          console.log("Error al recuperar la lista de comentarios");
          //this.informarErrorComentarios(<HttpErrorResponse>resp_ko);
          this.ocultarEspera();
        }
      );
  }

  public chipTocada() {
    console.log("chip toacada");
  }

  public async ocultarEspera(): Promise<void> {
    console.log("ocultandoEspera  ...");
    this.esperando = false;
    //SI LA COSA TARDA BASTANTE, SE HACE DISMISS DESDE AQUÍ SE HA PRESENTADO
    if (this.elementoEspera) {
      console.log("La tx termina después de mostrarse el elemento ");
      await this.elementoEspera.dismiss();
    } else {
      console.log("El elemento espera NO existe");
    }
  }

  public async mostrarEspera(mensaje: string): Promise<void> {
    this.esperando = true;
    console.log("Mostrando espera ...");
    this.elementoEspera = await this.lc.create({
      message: mensaje
    });
    console.log("elemento espera creado ...");
    await this.elementoEspera.present();
    console.log("elemento espera presentado ...");
    if (!this.esperando) {
      //SI LA COSA TARDA MUY POCO, CUANDO SE HA PRESENTADO YA HA ACABADO
      //CUANDO EL ELMENTO TERMINA DE PRESENTARSE, YA HA ACABADO :)
      console.log(
        "esperando == false la tx ha terminado antes de mostrarse el elemento"
      );
      await this.elementoEspera.dismiss();
    }
  }

  public async informarPeliSinComentarios(): Promise<void> {
    const toast = await this.tc.create({
      message: "Peli sin comentarios",
      duration: 2500,
      position: "middle"
    });
    toast.present();
  }
  publicarNuevoComentario() {
    let nuevoComentario: NuevoComentarioRequest;

    //construimos el nuevo comentario
    nuevoComentario = new NuevoComentarioRequest();
    nuevoComentario.token = this.login.token;
    nuevoComentario.idfoto = this.peli.idfoto;
    nuevoComentario.nombre = this.login.nombre;
    nuevoComentario.texto = this.nuevaOpinion;

    this.mostrarEspera("publicando comentario...");
    this.servicio_remoto.postComentarioPeli(nuevoComentario).subscribe(
      resp => {
        let respHttpResponse = resp as HttpResponse<void>;

        switch (respHttpResponse.status) {
          case 403:
          case 400:
            this.informarErrorInsertarComentario();
            break;
          case 201:
            this.refrescaComentarios(); //tb podemos informarl y despues de que cierre actualizar//this.informarComentarioBorrado();
            break;
        }
        this.nuevaOpinion = "";
        this.ocultarEspera();
      },
      error => {
        console.log("Error al recuperar la lista de comentarios");
        this.informarErrorComentarios(<HttpErrorResponse>error);
      }
    );

    // this.mostrarEspera();
    // this.servicio_remoto.getPelis(this.login.token).subscribe(
    //   resp_ok => {
    //     let respuesta_http : HttpResponse<Array<Peli>> = resp_ok as  HttpResponse<Array<Peli>>;
    //     this.lista_pelis = respuesta_http.body;
    //     this.lista_pelis.map(peli => console.log (peli.ruta + " " +peli.idfoto + " " +peli.titulo));
    //     this.ocultarEspera();

    console.log(this.nuevaOpinion);
  }
  cerrarAdd() {
    this.enEdicion = false;
  }

  addComentario() {
    console.log("toco el fab buttom");
    this.enEdicion = true;
  }

  ionViewDidEnter() {
    console.log("entroAqui");
  }

  public async informarErrorInsertarComentario(): Promise<void> {
    let alert: HTMLIonAlertElement = await this.ac.create({
      header: "Error al publicar el comentario",
      message: "Revise sus permisos o inténtelo más tarde",
      buttons: [
        {
          text: "Aceptar",
          handler: () => {
            console.log("se cierra el diálogo");
          }
        }
      ]
    });

    await alert.present();
  }

  refrescaComentarios() {
    console.log("Empieza el refresco de comentarios");

    this.servicio_remoto
      .getComentariosPeli(this.login.token, this.peli.idfoto)
      .subscribe(
        resp_ok => {
          let respuesta_http: HttpResponse<Array<
            Comentario
          >> = resp_ok as HttpResponse<Array<Comentario>>;
          if (respuesta_http.status == 200) {
            this.lista_comentarios = respuesta_http.body;
            this.lista_comentarios.map(comentario =>
              console.log(
                comentario.texto + " " + comentario.id + " " + comentario.autor
              )
            );
          } else if (respuesta_http.status == 204) {
            console.log("Pelicula sin comentarios");
            this.lista_comentarios = null;
            this.informarPeliSinComentarios();
          }
        },
        resp_ko => {
          console.log("Error al recuperar la lista de comentarios");
          this.informarErrorComentarios(<HttpErrorResponse>resp_ko);
        }
      );
  }

  public async informarErrorComentarios(
    error: HttpErrorResponse
  ): Promise<void> {
    let alert: HTMLIonAlertElement = await this.ac.create({
      header: error.statusText + " " + error.status,
      message: "¡Faltan comentarios! Inténtelo de nuevo",
      buttons: [
        {
          text: "Aceptar",
          handler: () => {
            console.log("se cierra el diálogo");
          }
        }
      ]
    });

    await alert.present();
  }

  borrar(comentario: Comentario, element: IonItemSliding) {
    this.pedirConfirmacion(comentario, element);
    console.log("borrar pinchado");
  }

  public async pedirConfirmacion(
    comentario: Comentario,
    elementoDeslizante: IonItemSliding
  ): Promise<void> {
    let alert: HTMLIonAlertElement = await this.ac.create({
      header: "MENSAJE DE CONFIRMACIÓN",
      message: "¿Confirma eliminar comentario #" + comentario.id + "?",
      buttons: [
        {
          text: "Sí",
          handler: () => {
            console.log("se cierra el diálogo");
            this.borrarConfirmado(comentario);
          }
        },
        {
          text: "No",
          handler: () => {
            console.log("se cierra el elemtno");
            elementoDeslizante.close();
          }
        }
      ]
    });

    await alert.present();
  }

  public async informarErrorBorrarComentarios(): Promise<void> {
    let alert: HTMLIonAlertElement = await this.ac.create({
      header: "Error al borrar el comentario",
      message: "Revise sus permisos o inténtelo más tarde",
      buttons: [
        {
          text: "Aceptar",
          handler: () => {
            console.log("se cierra el diálogo");
          }
        }
      ]
    });

    await alert.present();
  }
  borrarConfirmado(comentario: Comentario) {
    console.log("confirma que quiere borrar el comentario");
    this.servicio_remoto
      .deleteComentarioPeli(this.login.token, comentario.id, comentario.autor)
      .subscribe(
        resp_ok => {
          let respuesta_http: HttpResponse<void> = <HttpResponse<void>>resp_ok;
          switch (respuesta_http.status) {
            case 403:
            case 400:
              this.informarErrorBorrarComentarios();
              break;
            case 200:
              this.refrescaComentarios(); //this.informarComentarioBorrado();
              break;
          }
        },
        resp_ko => {
          this.informarErrorBorrarComentarios();
        }
      );
  }
  //asd
  getFechaHora(momento:number):string{
    let momentoCalculado:string;
    
      momentoCalculado =   new Date(momento).toISOString();

    return momentoCalculado;
  }
}
