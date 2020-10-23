<?php
$this->breadcrumbs=array(
	'Videos'=>array('index'),
	'ajouter',
);

$this->menu=array(
	array('label'=>'List Video', 'url'=>array('index')),
	array('label'=>'Manage Video', 'url'=>array('admin')),
);
?>

<h1>Ajouter une vidéo</h1>

<?php echo $this->renderPartial('_form', array('model'=>$model)); ?>